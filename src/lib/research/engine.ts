import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";
import { fetchWebsiteSnapshot } from "@/lib/research/website-fetcher";
import { factsFromWebsiteSnapshot, detectTriggersFromText, pickPrimaryTrigger } from "@/lib/research/trigger-detection";
import { generateResearchSummary } from "@/lib/research/summarizer";
import { computeLeadScore } from "@/lib/scoring/engine";
import type { ResearchFactInput, LeadContext } from "@/types/domain";

function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export type ResearchResult = { success: true } | { success: false; error: string };

/**
 * Runs the full research → score pipeline for a single lead (spec sections
 * 7-10, 44-45). Never throws — failures are captured on the lead
 * (pipelineStatus=FAILED, pipelineError) so a batch run never loses a lead.
 */
export async function runLeadResearch(leadId: string): Promise<ResearchResult> {
  try {
    await prisma.lead.update({
      where: { id: leadId },
      data: { pipelineStatus: "RESEARCHING", pipelineError: null },
    });
    await logActivity({ action: "research_started", leadId });

    const lead = await prisma.lead.findUniqueOrThrow({
      where: { id: leadId },
      include: { company: true, contact: true },
    });

    const facts: ResearchFactInput[] = [];

    // Carry forward any facts supplied at import time (e.g. CSV "notes"),
    // recorded as HIGH confidence since they were provided directly by the user.
    const existingManualFacts = await prisma.researchFact.findMany({
      where: { leadId, category: "other", sourceUrl: null },
    });
    for (const f of existingManualFacts) {
      facts.push({ factText: f.factText, sourceUrl: null, confidence: "HIGH", category: "other" });
    }

    let websiteUsesHttps: boolean | null = null;
    let hasSocialPresence = false;

    if (lead.company.website) {
      const snapshot = await fetchWebsiteSnapshot(lead.company.website);
      websiteUsesHttps = snapshot.usesHttps;
      hasSocialPresence = snapshot.hasSocialLinks;
      facts.push(...factsFromWebsiteSnapshot(snapshot));
    }

    if (lead.company.description) {
      const triggers = detectTriggersFromText(lead.company.description);
      for (const t of triggers) {
        facts.push({
          factText: `Company description suggests ${t.phrase}.`,
          sourceUrl: null,
          confidence: "MEDIUM",
          category: t.category,
        });
      }
    }

    // Replace prior auto-generated facts (website/trigger derived) but keep
    // manually supplied ones, then write the full current set.
    await prisma.researchFact.deleteMany({ where: { leadId, NOT: { AND: [{ category: "other" }, { sourceUrl: null }] } } });
    if (facts.length > 0) {
      await prisma.researchFact.createMany({
        data: facts
          .filter((f) => !(f.category === "other" && f.sourceUrl === null)) // manual ones already persisted
          .map((f) => ({
            leadId,
            factText: f.factText,
            sourceUrl: f.sourceUrl,
            confidence: f.confidence,
            category: f.category,
          })),
      });
    }

    const primaryTrigger = pickPrimaryTrigger([lead.company.description, ...facts.map((f) => f.factText)]);
    const triggerText = primaryTrigger ? primaryTrigger.phrase : lead.triggerText;
    const triggerCategory = primaryTrigger ? primaryTrigger.category : lead.triggerCategory;

    const sizeLabel =
      lead.company.sizeMin && lead.company.sizeMax
        ? `${lead.company.sizeMin}-${lead.company.sizeMax} employees`
        : null;

    const context: LeadContext = {
      leadId: lead.id,
      companyName: lead.company.name,
      website: lead.company.website,
      industry: lead.company.industry,
      country: lead.company.country,
      city: lead.company.city,
      companySizeLabel: sizeLabel,
      companyDescription: lead.company.description,
      contactName: lead.contact?.name ?? null,
      contactRole: lead.contact?.role ?? null,
      contactEmail: lead.contact?.email ?? null,
      facts,
      triggerText,
    };

    await prisma.lead.update({ where: { id: leadId }, data: { pipelineStatus: "SCORING", triggerText, triggerCategory } });

    const summary = await generateResearchSummary(context);
    await prisma.researchSummary.upsert({
      where: { leadId },
      create: {
        leadId,
        whatWeKnow: summary.whatWeKnow,
        whatTheyMayNeed: summary.whatTheyMayNeed,
        whyCulttwenty: summary.whyCulttwenty,
        outreachAngle: summary.outreachAngle,
        angle: summary.angle,
        model: summary.model,
      },
      update: {
        whatWeKnow: summary.whatWeKnow,
        whatTheyMayNeed: summary.whatTheyMayNeed,
        whyCulttwenty: summary.whyCulttwenty,
        outreachAngle: summary.outreachAngle,
        angle: summary.angle,
        model: summary.model,
        generatedAt: new Date(),
      },
    });

    const scoreBreakdown = computeLeadScore({
      industry: lead.company.industry,
      companySizeMin: lead.company.sizeMin,
      companySizeMax: lead.company.sizeMax,
      facts,
      triggerText,
      hasContactName: Boolean(lead.contact?.name),
      hasContactRole: Boolean(lead.contact?.role),
      hasValidEmail: isValidEmail(lead.contact?.email),
      websiteUsesHttps,
      hasSocialPresence,
    });

    // LeadScore has no doNotContact column (it lives on Lead) — strip it before persisting.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { doNotContact, ...leadScoreFields } = scoreBreakdown;
    await prisma.leadScore.upsert({
      where: { leadId },
      create: { leadId, ...leadScoreFields },
      update: { ...leadScoreFields, computedAt: new Date() },
    });

    const nextStatus = scoreBreakdown.doNotContact
      ? "DO_NOT_CONTACT"
      : lead.status === "RESEARCH"
        ? "QUALIFIED"
        : lead.status;

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        score: scoreBreakdown.total,
        grade: scoreBreakdown.grade,
        doNotContact: scoreBreakdown.doNotContact,
        status: nextStatus,
        pipelineStatus: "READY",
        pipelineError: null,
      },
    });

    await logActivity({
      action: "research_completed",
      leadId,
      meta: { score: scoreBreakdown.total, grade: scoreBreakdown.grade, factCount: facts.length },
    });

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown research error";
    await prisma.lead
      .update({ where: { id: leadId }, data: { pipelineStatus: "FAILED", pipelineError: message } })
      .catch(() => undefined);
    await logActivity({ action: "research_failed", leadId, meta: { error: message } }).catch(() => undefined);
    return { success: false, error: message };
  }
}

export async function runLeadResearchBatch(leadIds: string[]): Promise<{ succeeded: number; failed: number }> {
  let succeeded = 0;
  let failed = 0;
  // Sequential on purpose — avoids hammering target company websites with
  // concurrent requests and keeps AI API usage well within rate limits.
  for (const leadId of leadIds) {
    const result = await runLeadResearch(leadId);
    if (result.success) succeeded += 1;
    else failed += 1;
  }
  return { succeeded, failed };
}
