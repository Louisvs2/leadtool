import { prisma } from "@/lib/prisma";
import { buildLeadContext } from "@/lib/leads/context";
import { generateFollowupEmail } from "@/lib/email/generator";
import { sendEmailMessage } from "@/lib/sending/dispatcher";
import { stopFollowupsForLead } from "@/lib/followups/scheduler";
import { resolvePitchUrl } from "@/lib/pitch";
import { logActivity } from "@/lib/audit";

/**
 * Processes due follow-ups (spec sections 21-24). A follow-up only proceeds
 * automatically because the lead's INITIAL send was already human-approved
 * ("Follow-ups dürfen automatisiert werden, sofern der Lead vorher
 * freigegeben wurde") — it still re-checks reply/suppression state right
 * before sending, so a reply that came in after scheduling still stops it.
 */
export async function processFollowupQueue(batchSize = 5) {
  const due = await prisma.followup.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } },
    orderBy: { scheduledAt: "asc" },
    take: batchSize,
    include: { lead: { include: { contact: true, replies: true } } },
  });

  let sent = 0;
  let stopped = 0;
  let failed = 0;

  for (const followup of due) {
    const lead = followup.lead;

    if (lead.status === "DO_NOT_CONTACT" || lead.doNotContact) {
      await stopFollowupsForLead(lead.id, "Lead is marked Do Not Contact.");
      stopped += 1;
      continue;
    }
    if (lead.replies.length > 0) {
      await stopFollowupsForLead(lead.id, "Lead replied.");
      stopped += 1;
      continue;
    }
    if (!lead.contact?.email) {
      await prisma.followup.update({ where: { id: followup.id }, data: { status: "SKIPPED", stopReason: "No contact email on file." } });
      failed += 1;
      continue;
    }

    const previousInitial = await prisma.emailMessage.findFirst({
      where: { leadId: lead.id, type: "INITIAL", status: { in: ["SENT", "DELIVERED"] } },
      orderBy: { sentAt: "desc" },
    });
    if (!previousInitial) {
      await prisma.followup.update({ where: { id: followup.id }, data: { status: "SKIPPED", stopReason: "No prior sent email found." } });
      failed += 1;
      continue;
    }

    const built = await buildLeadContext(lead.id);
    if (!built || !built.summary) {
      await prisma.followup.update({ where: { id: followup.id }, data: { status: "SKIPPED", stopReason: "Missing research summary." } });
      failed += 1;
      continue;
    }

    const settings = await prisma.settings.findUnique({ where: { id: "default" } });
    const sequenceNumber = followup.sequenceNumber as 1 | 2 | 3;

    const generated = await generateFollowupEmail(built.context, built.summary, sequenceNumber, {
      senderName: settings?.senderName ?? "Louis",
      pitchUrl: await resolvePitchUrl(followup.campaignId),
      positioning: settings?.positioning ?? "Creative Production Company",
      capabilities: settings?.capabilities ?? "Film, Design, AI, 3D, Digital",
      signature: settings?.signature ?? "Louis\nCultTwenty",
      unsubscribeText: settings?.unsubscribeText ?? "",
    }, previousInitial.subject);

    const emailMessage = await prisma.emailMessage.create({
      data: {
        leadId: lead.id,
        campaignId: followup.campaignId,
        type: `FOLLOWUP_${sequenceNumber}` as "FOLLOWUP_1" | "FOLLOWUP_2" | "FOLLOWUP_3",
        variant: "A",
        toEmail: lead.contact.email,
        subject: generated.subject,
        body: generated.body,
        angle: generated.angle,
        confidence: generated.confidence,
        sources: JSON.stringify(generated.sources),
        generatedBy: generated.model,
        status: "QUEUED",
        scheduledAt: new Date(),
        approvedAt: new Date(),
      },
    });

    await prisma.followup.update({ where: { id: followup.id }, data: { emailMessageId: emailMessage.id } });

    const result = await sendEmailMessage(emailMessage.id);
    if (result.sent) {
      await prisma.followup.update({ where: { id: followup.id }, data: { status: "SENT" } });
      await logActivity({ action: "followup_sent", leadId: lead.id, meta: { sequenceNumber } });
      sent += 1;
    } else {
      failed += 1;
    }
  }

  return { processed: due.length, sent, stopped, failed };
}
