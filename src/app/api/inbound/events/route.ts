import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { addToSuppressionList } from "@/lib/sending/guard";
import { stopFollowupsForLead } from "@/lib/followups/scheduler";
import { logActivity } from "@/lib/audit";

const schema = z.object({
  providerMessageId: z.string(),
  type: z.enum(["delivered", "opened", "bounced", "complained", "clicked"]),
  payload: z.unknown().optional(),
});

/**
 * Generic delivery-event webhook (delivery/open/bounce/complaint tracking —
 * spec section 21). Point your provider's event webhook here (Resend
 * webhooks, SendGrid Event Webhook, etc.) and adapt field names as needed;
 * this expects { providerMessageId, type, payload }. A bounce or spam
 * complaint immediately suppresses the address and stops follow-ups.
 */
export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (!env.INBOUND_WEBHOOK_SECRET || secret !== env.INBOUND_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 422 });
  }
  const { providerMessageId, type, payload } = parsed.data;

  const message = await prisma.emailMessage.findFirst({ where: { providerMessageId } });
  if (!message) {
    return NextResponse.json({ error: "No message found for this providerMessageId" }, { status: 404 });
  }

  await prisma.emailEvent.create({
    data: { emailMessageId: message.id, type, payload: payload ? JSON.stringify(payload) : undefined },
  });

  if (type === "bounced") {
    await prisma.emailMessage.update({ where: { id: message.id }, data: { status: "BOUNCED" } });
    await addToSuppressionList(message.toEmail, "bounce", "Hard bounce reported by provider");
    await stopFollowupsForLead(message.leadId, "Email bounced.");
    await logActivity({ action: "email_bounced", leadId: message.leadId, campaignId: message.campaignId ?? undefined });
  } else if (type === "delivered" && message.status === "SENT") {
    await prisma.emailMessage.update({ where: { id: message.id }, data: { status: "DELIVERED" } });
  } else if (type === "complained") {
    await addToSuppressionList(message.toEmail, "complaint", "Spam complaint reported by provider");
    await stopFollowupsForLead(message.leadId, "Spam complaint received.");
  }

  return NextResponse.json({ ok: true });
}
