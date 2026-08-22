import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getEffectiveSecrets } from "@/lib/secrets";
import { recordReply } from "@/lib/reply/handler";
import { matchLeadForInboundEmail } from "@/lib/reply/match-lead";

const schema = z.object({
  from: z.string().email(),
  subject: z.string().optional(),
  text: z.string().min(1),
  inReplyToMessageId: z.string().optional(),
});

/**
 * Generic inbound-reply webhook. Point your email provider's inbound-parse
 * webhook (SendGrid Inbound Parse, Mailgun Routes, Postmark inbound, etc.)
 * at this URL — adapt the field mapping in your provider dashboard to send
 * { from, subject, text, inReplyToMessageId } as JSON. Authenticated via a
 * shared secret query param since providers can't attach session cookies.
 */
export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  const { inboundWebhookSecret } = await getEffectiveSecrets();
  if (!inboundWebhookSecret || secret !== inboundWebhookSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 422 });
  }
  const { from, subject, text, inReplyToMessageId } = parsed.data;

  const { leadId, emailMessageId } = await matchLeadForInboundEmail({ fromEmail: from, inReplyToMessageId });

  if (!leadId) {
    return NextResponse.json({ error: "NO MATCHING LEAD — could not associate this reply with a known contact." }, { status: 404 });
  }

  const reply = await recordReply({ leadId, emailMessageId, fromEmail: from, subject, body: text });

  return NextResponse.json({ ok: true, replyId: reply.id, leadId });
}
