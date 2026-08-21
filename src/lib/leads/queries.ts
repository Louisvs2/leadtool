import { prisma } from "@/lib/prisma";
import type { Prisma, LeadStatus } from "@prisma/client";

export type LeadFilters = {
  status?: string;
  minScore?: string;
  industry?: string;
  country?: string;
  search?: string;
  campaignId?: string;
  includeDemo?: boolean;
};

export function buildLeadWhere(filters: LeadFilters): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = {};
  if (filters.status) where.status = filters.status as LeadStatus;
  if (filters.minScore) where.score = { gte: Number(filters.minScore) };
  if (filters.includeDemo === false) where.isDemo = false;
  if (filters.campaignId) where.campaignLeads = { some: { campaignId: filters.campaignId } };
  if (filters.industry || filters.country || filters.search) {
    where.company = {
      ...(filters.industry ? { industry: filters.industry } : {}),
      ...(filters.country ? { country: filters.country } : {}),
      ...(filters.search ? { name: { contains: filters.search, mode: "insensitive" } } : {}),
    };
  }
  return where;
}

export async function findLeads(filters: LeadFilters, take = 500) {
  return prisma.lead.findMany({
    where: buildLeadWhere(filters),
    include: {
      company: true,
      contact: true,
      campaignLeads: { include: { campaign: true } },
    },
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    take,
  });
}
