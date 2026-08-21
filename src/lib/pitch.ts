import { env } from "@/lib/env";

export function getAppBaseUrl(): string {
  return (env.AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Builds a self-hosted tracking redirect for the pitch link (spec section
 * 33). The generated email embeds this URL instead of the raw pitch page —
 * clicking it logs a PitchVisit here, then 307-redirects to the real
 * destination, so click-through is measurable even though the destination
 * page itself lives outside this app.
 */
export function buildPitchTrackingUrl(leadId: string, campaignId?: string | null): string {
  const url = new URL("/api/pitch", getAppBaseUrl());
  url.searchParams.set("lead", leadId);
  if (campaignId) url.searchParams.set("campaign", campaignId);
  return url.toString();
}
