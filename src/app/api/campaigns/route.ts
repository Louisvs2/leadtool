import { NextRequest, NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";
import { createCampaignSchema } from "@/lib/validation/campaigns";
import { getSettings } from "@/lib/settings";

export async function GET() {
  try {
    await requireSession();
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        campaignLeads: true,
        emailMessages: { include: { events: true, replies: true } },
      },
    });
    return NextResponse.json({ campaigns });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const data = createCampaignSchema.parse(await request.json());
    const settings = await getSettings();

    const campaign = await prisma.campaign.create({
      data: {
        name: data.name,
        angle: data.angle,
        pitchUrl: data.pitchUrl || settings.pitchUrl,
        minScore: data.minScore,
        includeBelowThreshold: data.includeBelowThreshold,
        targetCountries: data.targetCountries,
        targetIndustries: data.targetIndustries,
        sendWindowStart: settings.sendWindowStart,
        sendWindowEnd: settings.sendWindowEnd,
        sendDaysOfWeek: settings.sendDaysOfWeek,
        maxSendsPerDay: settings.maxSendsPerDay,
        minDelaySeconds: settings.minDelaySeconds,
        maxDelaySeconds: settings.maxDelaySeconds,
        followup1Days: settings.followup1Days,
        followup2Days: settings.followup2Days,
        followup3Days: settings.followup3Days,
        followupsEnabled: settings.followupsEnabled,
        status: "DRAFT",
      },
    });

    await prisma.campaignLead.createMany({
      data: data.leadIds.map((leadId) => ({ campaignId: campaign.id, leadId, status: "SELECTED" as const })),
      skipDuplicates: true,
    });

    await logActivity({ action: "campaign_created", campaignId: campaign.id, userId: session.user.id, meta: { leadCount: data.leadIds.length } });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
