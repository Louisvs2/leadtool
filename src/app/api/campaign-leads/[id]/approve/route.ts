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
    if (!campaignLead.selectedVariant) throw new ApiError("No variant selected yet.", 422);

    const message = await prisma.emailMessage.findFirst({
      where: { campaignId: campaignLead.campaignId, leadId: campaignLead.leadId, type: "INITIAL", variant: campaignLead.selectedVariant },
    });
    if (!message) throw new ApiError("Selected variant not found.", 404);

    await prisma.emailMessage.updateMany({
      where: { campaignId: campaignLead.campaignId, leadId: campaignLead.leadId, type: "INITIAL", id: { not: message.id }, status: "DRAFT" },
      data: { status: "REJECTED" },
    });
    await prisma.emailMessage.update({ where: { id: message.id }, data: { status: "APPROVED", approvedAt: new Date() } });
    await prisma.campaignLead.update({ where: { id }, data: { status: "APPROVED" } });

    await logActivity({ action: "email_approved", leadId: campaignLead.leadId, campaignId: campaignLead.campaignId, meta: { variant: campaignLead.selectedVariant } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
