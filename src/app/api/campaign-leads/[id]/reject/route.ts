import { NextResponse } from "next/server";
import { requireSession, handleApiError, ApiError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;

    const campaignLead = await prisma.campaignLead.findUnique({ where: { id } });
    if (!campaignLead) throw new ApiError("Campaign lead not found", 404);

    await prisma.emailMessage.updateMany({
      where: { campaignId: campaignLead.campaignId, leadId: campaignLead.leadId, type: "INITIAL", status: "DRAFT" },
      data: { status: "REJECTED" },
    });
    await prisma.campaignLead.update({ where: { id }, data: { status: "REJECTED" } });

    await logActivity({ action: "email_rejected", leadId: campaignLead.leadId, campaignId: campaignLead.campaignId });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
