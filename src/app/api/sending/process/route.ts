import { NextResponse } from "next/server";
import { requireSession, handleApiError } from "@/lib/api-helpers";
import { processSendQueue } from "@/lib/sending/queue";
import { processFollowupQueue } from "@/lib/followups/queue";

/**
 * Dispatches whatever is currently due (QUEUED emails + SCHEDULED
 * follow-ups). Safe to call as often as you like — pacing is enforced by
 * each row's own scheduledAt, not by call frequency. In production, wire
 * this up to a scheduled trigger (e.g. Vercel Cron hitting this route once
 * a minute) instead of calling it manually — see vercel.json.
 */
export async function POST() {
  try {
    await requireSession();
    const [sendResult, followupResult] = await Promise.all([processSendQueue(10), processFollowupQueue(5)]);
    return NextResponse.json({ send: sendResult, followups: followupResult });
  } catch (error) {
    return handleApiError(error);
  }
}
