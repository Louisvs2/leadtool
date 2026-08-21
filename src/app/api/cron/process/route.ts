import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { processSendQueue } from "@/lib/sending/queue";
import { processFollowupQueue } from "@/lib/followups/queue";
import { processResearchQueue } from "@/lib/research/queue";

/**
 * Cron entry point (see vercel.json) — dispatches due queued emails and
 * follow-ups, and drains any backlog of QUEUED research. Authenticated via
 * a shared secret rather than a session, since it's called by the
 * scheduler, not a signed-in browser.
 */
export async function POST(request: NextRequest) {
  if (!env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [research, send, followups] = await Promise.all([
    processResearchQueue(10),
    processSendQueue(20),
    processFollowupQueue(10),
  ]);

  return NextResponse.json({ research, send, followups });
}

// Vercel Cron issues GET requests by default.
export async function GET(request: NextRequest) {
  return POST(request);
}
