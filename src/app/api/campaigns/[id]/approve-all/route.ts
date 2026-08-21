import { NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id: campaignId } = await params;

    const readyLeads = await prisma.campaignLead.findMany({
      where: { campaignId, status: "READY_FOR_REVIEW" },
    });

    let approved = 0;
    for (const campaignLead of readyLeads) {
      if (!campaignLead.selectedVariant) continue;
      const message = await prisma.emailMessage.findFirst({
        where: {
          campaignId,
          leadId: campaignLead.leadId,
          type: "INITIAL",
          variant: campaignLead.selectedVariant,
          status: "DRAFT",
        },
      });
      if (!message) continue;

      await prisma.emailMessage.updateMany({
        where: { campaignId, leadId: campaignLead.leadId, type: "INITIAL", id: { not: message.id }, status: "DRAFT" },
        data: { status: "REJECTED" },
      });
      await prisma.emailMessage.update({ where: { id: message.id }, data: { status: "APPROVED", approvedAt: new Date() } });
      await prisma.campaignLead.update({ where: { id: campaignLead.id }, data: { status: "APPROVED" } });
      approved += 1;
    }

    await logActivity({ action: "campaign_approved", campaignId, userId: session.user.id, meta: { approved } });

    return NextResponse.json({ approved });
  } catch (error) {
    return handleApiError(error);
  }
}
