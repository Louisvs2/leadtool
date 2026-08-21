import { NextRequest, NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { buildLeadsCsv } from "@/lib/csv/export";
import type { Prisma, LeadStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const minScore = searchParams.get("minScore");

    const where: Prisma.LeadWhereInput = {};
    if (status) where.status = status as LeadStatus;
    if (minScore) where.score = { gte: Number(minScore) };

    const leads = await prisma.lead.findMany({
      where,
      include: { company: true, contact: true, campaignLeads: { include: { campaign: true } } },
      orderBy: { createdAt: "desc" },
    });

    const csv = buildLeadsCsv(leads);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="leads-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
