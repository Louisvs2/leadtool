import type { Campaign, CampaignLead, Lead, EmailMessage, EmailEvent, Reply, Opportunity } from "@prisma/client";

type CampaignWithRelations = Campaign & {
  campaignLeads: (CampaignLead & { lead: Lead & { opportunities: Opportunity[] } })[];
  emailMessages: (EmailMessage & { events: EmailEvent[]; replies: Reply[] })[];
};

export type CampaignStats = {
  leads: number;
  sent: number;
  delivered: number;
  opened: number;
  bounced: number;
  replies: number;
  positiveReplies: number;
  meetings: number;
  pipeline: number;
  revenue: number;
};

const MEETING_STAGES = new Set(["CALL", "PROPOSAL", "NEGOTIATION", "WON"]);
const POSITIVE_CATEGORIES = new Set(["INTERESTED", "HOT_LEAD"]);

export function computeCampaignStats(campaign: CampaignWithRelations): CampaignStats {
  const initialMessages = campaign.emailMessages.filter((m) => m.type === "INITIAL");
  const sent = initialMessages.filter((m) => ["SENT", "DELIVERED", "BOUNCED"].includes(m.status)).length;
  const delivered = campaign.emailMessages.filter((m) => m.events.some((e) => e.type === "delivered") || m.status === "DELIVERED").length;
  const opened = campaign.emailMessages.reduce((sum, m) => sum + m.events.filter((e) => e.type === "opened").length, 0);
  const bounced = campaign.emailMessages.filter((m) => m.status === "BOUNCED").length;

  const allReplies = campaign.emailMessages.flatMap((m) => m.replies);
  const replies = allReplies.length;
  const positiveReplies = allReplies.filter((r) => POSITIVE_CATEGORIES.has(r.category)).length;

  const meetings = campaign.campaignLeads.filter((cl) => MEETING_STAGES.has(cl.lead.status)).length;

  const pipeline = campaign.campaignLeads.reduce((sum, cl) => {
    const open = cl.lead.opportunities.filter((o) => o.stage === "OPEN");
    return sum + open.reduce((s, o) => s + o.value, 0);
  }, 0);

  const revenue = campaign.campaignLeads.reduce((sum, cl) => {
    const won = cl.lead.opportunities.filter((o) => o.stage === "WON");
    return sum + won.reduce((s, o) => s + o.value, 0);
  }, 0);

  return {
    leads: campaign.campaignLeads.length,
    sent,
    delivered,
    opened,
    bounced,
    replies,
    positiveReplies,
    meetings,
    pipeline,
    revenue,
  };
}
