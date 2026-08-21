import { prisma } from "@/lib/prisma";

export async function getDashboardStats() {
  const [
    totalLeads,
    qualified,
    readyToContact,
    sent,
    replies,
    meetings,
    opportunities,
    pipelineAgg,
    demoLeadCount,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { doNotContact: false, score: { not: null } } }),
    prisma.lead.count({ where: { status: "QUALIFIED", doNotContact: false } }),
    prisma.emailMessage.count({ where: { type: "INITIAL", status: { in: ["SENT", "DELIVERED"] } } }),
    prisma.reply.count(),
    prisma.lead.count({ where: { status: { in: ["CALL", "PROPOSAL", "NEGOTIATION", "WON"] } } }),
    prisma.opportunity.count({ where: { stage: "OPEN" } }),
    prisma.opportunity.aggregate({ where: { stage: "OPEN" }, _sum: { value: true } }),
    prisma.lead.count({ where: { isDemo: true } }),
  ]);

  return {
    totalLeads,
    qualified,
    readyToContact,
    sent,
    replies,
    meetings,
    opportunities,
    estimatedPipeline: pipelineAgg._sum.value ?? 0,
    demoLeadCount,
  };
}

export async function getRecentActivity(limit = 12) {
  return prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      lead: { include: { company: true } },
      campaign: true,
    },
  });
}
