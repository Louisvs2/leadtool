import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";

/**
 * Creates the 3-step follow-up sequence (spec section 23) after an INITIAL
 * email successfully sends. Uses the campaign's schedule if the send was
 * part of a campaign, otherwise falls back to global Settings defaults.
 */
export async function scheduleFollowupsForLead(leadId: string, campaignId: string | null, afterEmailMessageId: string) {
  const settings = await prisma.settings.findUnique({ where: { id: "default" } });
  const campaign = campaignId ? await prisma.campaign.findUnique({ where: { id: campaignId } }) : null;

  const followupsEnabled = campaign?.followupsEnabled ?? settings?.followupsEnabled ?? true;
  if (!followupsEnabled) return;

  const days = {
    1: campaign?.followup1Days ?? settings?.followup1Days ?? 4,
    2: campaign?.followup2Days ?? settings?.followup2Days ?? 9,
    3: campaign?.followup3Days ?? settings?.followup3Days ?? 18,
  };

  const baseDate = new Date();

  for (const seq of [1, 2, 3] as const) {
    const scheduledAt = new Date(baseDate.getTime() + days[seq] * 24 * 60 * 60 * 1000);
    await prisma.followup.create({
      data: {
        leadId,
        campaignId: campaignId ?? undefined,
        sequenceNumber: seq,
        scheduledAt,
        status: "SCHEDULED",
      },
    });
  }

  await logActivity({ action: "followup_scheduled", leadId, campaignId: campaignId ?? undefined, meta: { afterEmailMessageId, days } });
}

/**
 * Stops every still-scheduled follow-up for a lead (reply received, bounce,
 * or unsubscribe — spec section 23: "FOLLOW-UPS AUTOMATICALLY STOP").
 */
export async function stopFollowupsForLead(leadId: string, reason: string) {
  const { count } = await prisma.followup.updateMany({
    where: { leadId, status: "SCHEDULED" },
    data: { status: "STOPPED", stopReason: reason },
  });
  if (count > 0) {
    await logActivity({ action: "followup_stopped", leadId, meta: { reason, count } });
  }
  return count;
}
