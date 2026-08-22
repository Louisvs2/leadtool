import { NextRequest, NextResponse } from "next/server";
import { getEffectiveSecrets } from "@/lib/secrets";
import { processSendQueue } from "@/lib/sending/queue";
import { processFollowupQueue } from "@/lib/followups/queue";
import { processResearchQueue } from "@/lib/research/queue";
import { pollOutlookInbox } from "@/lib/email/providers/outlook-inbound";

/**
 * Cron entry point (see .github/workflows/cron.yml) — dispatches due queued
 * emails and follow-ups, drains any backlog of QUEUED research, and (when
 * Outlook is the active provider) polls for new replies. Authenticated via
 * a shared secret rather than a session, since it's called by the
 * scheduler, not a signed-in browser.
 */
export async function POST(request: NextRequest) {
  const { cronSecret } = await getEffectiveSecrets();
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [research, send, followups, outlookInbox] = await Promise.all([
    processResearchQueue(10),
    processSendQueue(20),
    processFollowupQueue(10),
    pollOutlookInbox(),
  ]);

  return NextResponse.json({ research, send, followups, outlookInbox });
}

// Vercel Cron issues GET requests by default.
export async function GET(request: NextRequest) {
  return POST(request);
}
