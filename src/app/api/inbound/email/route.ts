import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { recordReply } from "@/lib/reply/handler";

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
  if (!env.INBOUND_WEBHOOK_SECRET || secret !== env.INBOUND_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.flatten() }, { status: 422 });
  }
  const { from, subject, text, inReplyToMessageId } = parsed.data;

  let leadId: string | null = null;
  let emailMessageId: string | undefined;

  if (inReplyToMessageId) {
    const message = await prisma.emailMessage.findFirst({ where: { providerMessageId: inReplyToMessageId } });
    if (message) {
      leadId = message.leadId;
      emailMessageId = message.id;
    }
  }

  if (!leadId) {
    const contact = await prisma.contact.findFirst({
      where: { email: from.toLowerCase() },
      orderBy: { createdAt: "desc" },
      include: { leads: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    leadId = contact?.leads[0]?.id ?? null;
  }

  if (!leadId) {
    return NextResponse.json({ error: "NO MATCHING LEAD — could not associate this reply with a known contact." }, { status: 404 });
  }

  const reply = await recordReply({ leadId, emailMessageId, fromEmail: from, subject, body: text });

  return NextResponse.json({ ok: true, replyId: reply.id, leadId });
}
