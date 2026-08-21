import { prisma } from "@/lib/prisma";

export async function getAnalyticsOverview() {
  const [
    sent,
    delivered,
    bounced,
    replies,
    positiveReplies,
    meetings,
    opportunitiesOpen,
    opportunitiesWon,
    revenueAgg,
    pipelineAgg,
  ] = await Promise.all([
    prisma.emailMessage.count({ where: { type: "INITIAL", status: { in: ["SENT", "DELIVERED", "BOUNCED"] } } }),
    prisma.emailMessage.count({ where: { status: "DELIVERED" } }),
    prisma.emailMessage.count({ where: { status: "BOUNCED" } }),
    prisma.reply.count(),
    prisma.reply.count({ where: { category: { in: ["INTERESTED", "HOT_LEAD"] } } }),
    prisma.lead.count({ where: { status: { in: ["CALL", "PROPOSAL", "NEGOTIATION", "WON"] } } }),
    prisma.opportunity.count({ where: { stage: "OPEN" } }),
    prisma.opportunity.count({ where: { stage: "WON" } }),
    prisma.opportunity.aggregate({ where: { stage: "WON" }, _sum: { value: true } }),
    prisma.opportunity.aggregate({ where: { stage: "OPEN" }, _sum: { value: true } }),
  ]);

  const conversionRate = sent > 0 ? (opportunitiesWon / sent) * 100 : 0;

  return {
    sent,
    delivered,
    bounced,
    replies,
    positiveReplies,
    meetings,
    opportunitiesOpen,
    opportunitiesWon,
    revenue: revenueAgg._sum.value ?? 0,
    pipelineValue: pipelineAgg._sum.value ?? 0,
    conversionRate,
  };
}

export async function getFunnelCounts() {
  const statuses = ["RESEARCH", "QUALIFIED", "CONTACTED", "REPLIED", "CALL", "PROPOSAL", "NEGOTIATION", "WON"] as const;
  const counts = await Promise.all(statuses.map((status) => prisma.lead.count({ where: { status } })));
  return statuses.map((status, i) => ({ status, count: counts[i] }));
}
