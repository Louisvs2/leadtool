import { NextResponse } from "next/server";
import { requireSession, handleApiError, ApiError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";
import { computeSendSchedule } from "@/lib/sending/schedule";
import { assertSendable } from "@/lib/sending/guard";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id: campaignId } = await params;

    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new ApiError("Campaign not found", 404);
    if (!campaign.complianceConfirmed) {
      throw new ApiError("Confirm the compliance checklist before sending.", 422);
    }

    const approvedLeads = await prisma.campaignLead.findMany({
      where: { campaignId, status: "APPROVED" },
      include: { lead: true },
    });

    const sendableMessageIds: string[] = [];
    let blocked = 0;

    for (const campaignLead of approvedLeads) {
      const message = await prisma.emailMessage.findFirst({
        where: { campaignId, leadId: campaignLead.leadId, status: "APPROVED" },
      });
      if (!message) continue;

      const guard = await assertSendable({ toEmail: message.toEmail, isDemo: campaignLead.lead.isDemo });
      if (!guard.allowed) {
        blocked += 1;
        continue;
      }
      sendableMessageIds.push(message.id);
    }

    if (sendableMessageIds.length === 0) {
      throw new ApiError("No approved, sendable messages to queue. Approve leads first.", 422);
    }

    const schedule = computeSendSchedule(sendableMessageIds.length, {
      sendWindowStart: campaign.sendWindowStart,
      sendWindowEnd: campaign.sendWindowEnd,
      sendDaysOfWeek: campaign.sendDaysOfWeek,
      maxSendsPerDay: campaign.maxSendsPerDay,
      minDelaySeconds: campaign.minDelaySeconds,
      maxDelaySeconds: campaign.maxDelaySeconds,
      startAt: campaign.startAt,
    });

    for (let i = 0; i < sendableMessageIds.length; i += 1) {
      await prisma.emailMessage.update({
        where: { id: sendableMessageIds[i] },
        data: { status: "QUEUED", scheduledAt: schedule[i] },
      });
    }

    await prisma.campaignLead.updateMany({
      where: { campaignId, status: "APPROVED" },
      data: { status: "QUEUED" },
    });

    await prisma.campaign.update({ where: { id: campaignId }, data: { status: "ACTIVE", startAt: schedule[0] } });

    await logActivity({ action: "campaign_sent", campaignId, userId: session.user.id, meta: { queued: sendableMessageIds.length, blocked } });

    return NextResponse.json({ queued: sendableMessageIds.length, blocked, firstSendAt: schedule[0], lastSendAt: schedule[schedule.length - 1] });
  } catch (error) {
    return handleApiError(error);
  }
}
