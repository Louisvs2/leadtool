import { prisma } from "@/lib/prisma";
import type { LeadContext } from "@/types/domain";
import type { ResearchSummaryLike } from "@/lib/email/generator";

export async function buildLeadContext(leadId: string): Promise<{
  context: LeadContext;
  summary: ResearchSummaryLike | null;
} | null> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      company: true,
      contact: true,
      researchFacts: true,
      researchSummary: true,
    },
  });
  if (!lead) return null;

  const sizeLabel =
    lead.company.sizeMin && lead.company.sizeMax ? `${lead.company.sizeMin}-${lead.company.sizeMax} employees` : null;

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
    facts: lead.researchFacts.map((f) => ({
      factText: f.factText,
      sourceUrl: f.sourceUrl,
      confidence: f.confidence,
      category: f.category as LeadContext["facts"][number]["category"],
    })),
    triggerText: lead.triggerText,
  };

  const summary: ResearchSummaryLike | null = lead.researchSummary
    ? {
        whatWeKnow: lead.researchSummary.whatWeKnow,
        whatTheyMayNeed: lead.researchSummary.whatTheyMayNeed,
        whyCulttwenty: lead.researchSummary.whyCulttwenty,
        outreachAngle: lead.researchSummary.outreachAngle,
        angle: lead.researchSummary.angle,
      }
    : null;

  return { context, summary };
}
