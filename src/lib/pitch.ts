import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

export function getAppBaseUrl(): string {
  return (env.AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

/**
 * The URL to put in an outreach email's pitch link, in priority order:
 * the campaign's own override, then the global default from Settings.
 * Embedded directly (not behind a tracking redirect) so what's in the
 * email — and what the reviewer sees before approving — is the real,
 * recognizable destination rather than an internal-looking app URL.
 */
export async function resolvePitchUrl(campaignId?: string | null): Promise<string> {
  if (campaignId) {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { pitchUrl: true } });
    if (campaign?.pitchUrl) return campaign.pitchUrl;
  }
  const settings = await getSettings();
  return settings.pitchUrl;
}
