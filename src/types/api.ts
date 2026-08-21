import type { Prisma } from "@prisma/client";

export type LeadListItem = Prisma.LeadGetPayload<{
  include: {
    company: true;
    contact: true;
    campaignLeads: { include: { campaign: true } };
  };
}>;

export type LeadDetail = Prisma.LeadGetPayload<{
  include: {
    company: true;
    contact: true;
    researchFacts: true;
    researchSummary: true;
    leadScore: true;
    emailMessages: { include: { events: true } };
    replies: true;
    followups: true;
    opportunities: true;
    notes: true;
    activityLogs: true;
    campaignLeads: { include: { campaign: true } };
  };
}>;
