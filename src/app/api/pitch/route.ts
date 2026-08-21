import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

/**
 * Pitch click tracker (spec section 33). Public by design — this is the
 * link recipients click from their inbox, so it can't require a session.
 * Logs the visit, then redirects to the real pitch destination.
 */
export async function GET(request: NextRequest) {
  const leadId = request.nextUrl.searchParams.get("lead");
  const campaignId = request.nextUrl.searchParams.get("campaign");

  const settings = await getSettings();
  let destination = settings.pitchUrl;

  if (campaignId) {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (campaign?.pitchUrl) destination = campaign.pitchUrl;
  }

  if (leadId) {
    await prisma.pitchVisit.create({
      data: {
        leadId,
        campaignId: campaignId || undefined,
        referrer: request.headers.get("referer") ?? undefined,
        userAgent: request.headers.get("user-agent") ?? undefined,
      },
    }).catch(() => undefined); // never block the redirect on a logging failure
  }

  return NextResponse.redirect(destination, { status: 307 });
}
