import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";
import { runLeadResearch } from "@/lib/research/engine";
import { buildLeadContext } from "@/lib/leads/context";
import { generateAllEmailVariants } from "@/lib/email/generator";
import { runEmailQualityCheck } from "@/lib/email/quality-check";
import { getSettings } from "@/lib/settings";

/**
 * Bulk-generates personalized outreach for a batch of SELECTED campaign
 * leads (spec section 19 — one individually researched message per lead,
 * never the same email reused). Meant to be polled like the research queue
 * so a 183-lead campaign never runs into a single request's time limit.
 */
export async function processCampaignGeneration(campaignId: string, batchSize = 3) {
  const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } }); // 404s cleanly if the campaign doesn't exist
  const settings = await getSettings();
  const pitchUrl = campaign.pitchUrl || settings.pitchUrl;

  const batch = await prisma.campaignLead.findMany({
    where: { campaignId, status: "SELECTED" },
    take: batchSize,
    include: { lead: { include: { contact: true } } },
  });

  for (const campaignLead of batch) {
    await prisma.campaignLead.update({ where: { id: campaignLead.id }, data: { status: "GENERATING" } });

    const lead = campaignLead.lead;

    if (lead.pipelineStatus !== "READY") {
      const result = await runLeadResearch(lead.id);
      if (!result.success) {
        await prisma.campaignLead.update({
          where: { id: campaignLead.id },
          data: { status: "FAILED", failureReason: `Research failed: ${result.error}` },
        });
        continue;
      }
    }

    const freshLead = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id }, include: { contact: true } });
    if (!freshLead.contact?.email) {
      await prisma.campaignLead.update({
        where: { id: campaignLead.id },
        data: { status: "FAILED", failureReason: "No contact email on file" },
      });
      continue;
    }
    if (freshLead.doNotContact && !campaign.includeBelowThreshold) {
      await prisma.campaignLead.update({
        where: { id: campaignLead.id },
        data: {
          status: "FAILED",
          failureReason: `Scored below 60 / DO NOT CONTACT (score ${freshLead.score ?? "?"}) — enable "include below threshold" on the campaign to reach out anyway`,
        },
      });
      continue;
    }

    const built = await buildLeadContext(lead.id);
    if (!built?.summary) {
      await prisma.campaignLead.update({
        where: { id: campaignLead.id },
        data: { status: "FAILED", failureReason: "Research summary unavailable" },
      });
      continue;
    }

    const senderSettings = {
      senderName: settings.senderName,
      pitchUrl,
      positioning: settings.positioning,
      capabilities: settings.capabilities,
      signature: settings.signature,
      unsubscribeText: settings.unsubscribeText,
    };

    const variants = await generateAllEmailVariants(built.context, built.summary, senderSettings);

    await prisma.emailMessage.deleteMany({ where: { leadId: lead.id, campaignId, type: "INITIAL", status: "DRAFT" } });

    for (const key of ["A", "B", "C"] as const) {
      const variant = variants[key];
      const qc = await runEmailQualityCheck({ subject: variant.subject, body: variant.body, type: "INITIAL", context: built.context });
      await prisma.emailMessage.create({
        data: {
          leadId: lead.id,
          campaignId,
          type: "INITIAL",
          variant: key,
          toEmail: freshLead.contact.email,
          subject: variant.subject,
          body: variant.body,
          angle: variant.angle,
          confidence: variant.confidence,
          sources: JSON.stringify(variant.sources),
          qualityCheck: JSON.stringify(qc),
          status: "DRAFT",
        },
      });
    }

    await prisma.campaignLead.update({
      where: { id: campaignLead.id },
      data: { status: "READY_FOR_REVIEW", selectedVariant: "A" },
    });

    await logActivity({
      action: "email_generated",
      leadId: lead.id,
      campaignId,
      meta: { variants: ["A", "B", "C"], ...(freshLead.doNotContact ? { lowScoreOverride: true } : {}) },
    });
  }

  const [selected, generating, readyForReview, failed] = await Promise.all([
    prisma.campaignLead.count({ where: { campaignId, status: "SELECTED" } }),
    prisma.campaignLead.count({ where: { campaignId, status: "GENERATING" } }),
    prisma.campaignLead.count({ where: { campaignId, status: "READY_FOR_REVIEW" } }),
    prisma.campaignLead.count({ where: { campaignId, status: "FAILED" } }),
  ]);

  return {
    processedThisBatch: batch.length,
    remainingSelected: selected,
    generating,
    readyForReview,
    failed,
    done: selected === 0 && generating === 0,
  };
}
