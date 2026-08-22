import { prisma } from "@/lib/prisma";

/**
 * Resolves an inbound email (from any source — webhook or poller) to the
 * lead it's a reply to. Prefers matching the message it's replying to via
 * providerMessageId; falls back to the most recent lead for that contact
 * email, since not every provider round-trips a reliable in-reply-to id.
 */
export async function matchLeadForInboundEmail(params: { fromEmail: string; inReplyToMessageId?: string }) {
  let leadId: string | null = null;
  let emailMessageId: string | undefined;

  if (params.inReplyToMessageId) {
    const message = await prisma.emailMessage.findFirst({ where: { providerMessageId: params.inReplyToMessageId } });
    if (message) {
      leadId = message.leadId;
      emailMessageId = message.id;
    }
  }

  if (!leadId) {
    const contact = await prisma.contact.findFirst({
      where: { email: params.fromEmail.toLowerCase() },
      orderBy: { createdAt: "desc" },
      include: { leads: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    leadId = contact?.leads[0]?.id ?? null;
  }

  return { leadId, emailMessageId };
}
