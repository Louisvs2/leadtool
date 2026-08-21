import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";
import { assertSendable } from "@/lib/sending/guard";
import { getActiveEmailProvider } from "@/lib/email/registry";
import { scheduleFollowupsForLead } from "@/lib/followups/scheduler";

const MAX_RETRIES = 3;
const RETRY_BACKOFF_MINUTES = [5, 30, 120];

export type DispatchResult = { sent: true } | { sent: false; reason: string; willRetry: boolean };

/**
 * Sends a single already-approved EmailMessage via the active provider.
 * Handles the guard check, retry/backoff, event logging and — for INITIAL
 * sends — scheduling the follow-up sequence (spec sections 21-24).
 */
export async function sendEmailMessage(emailMessageId: string): Promise<DispatchResult> {
  const message = await prisma.emailMessage.findUniqueOrThrow({
    where: { id: emailMessageId },
    include: { lead: { include: { company: true, contact: true } } },
  });

  const guard = await assertSendable({ toEmail: message.toEmail, isDemo: message.lead.isDemo });
  if (!guard.allowed) {
    await prisma.emailMessage.update({
      where: { id: emailMessageId },
      data: { status: "FAILED", error: guard.reason },
    });
    await logActivity({ action: "email_failed", leadId: message.leadId, meta: { reason: guard.reason } });
    return { sent: false, reason: guard.reason, willRetry: false };
  }

  const settings = await prisma.settings.findUnique({ where: { id: "default" } });
  const provider = await getActiveEmailProvider();

  const result = await provider.send({
    to: message.toEmail,
    subject: message.subject,
    body: message.body,
    fromName: settings?.senderName ?? "CultTwenty",
    fromEmail: settings?.senderEmail ?? "hello@culttwenty.de",
    replyTo: settings?.replyTo,
  });

  if (!result.ok) {
    const nextRetryCount = message.retryCount + 1;
    if (nextRetryCount < MAX_RETRIES) {
      const backoffMinutes = RETRY_BACKOFF_MINUTES[Math.min(nextRetryCount - 1, RETRY_BACKOFF_MINUTES.length - 1)];
      await prisma.emailMessage.update({
        where: { id: emailMessageId },
        data: {
          retryCount: nextRetryCount,
          error: result.error,
          status: "QUEUED",
          scheduledAt: new Date(Date.now() + backoffMinutes * 60_000),
        },
      });
      return { sent: false, reason: result.error, willRetry: true };
    }

    await prisma.emailMessage.update({
      where: { id: emailMessageId },
      data: { status: "FAILED", retryCount: nextRetryCount, error: result.error },
    });
    await logActivity({ action: "email_failed", leadId: message.leadId, meta: { reason: result.error } });
    return { sent: false, reason: result.error, willRetry: false };
  }

  await prisma.emailMessage.update({
    where: { id: emailMessageId },
    data: {
      status: "SENT",
      sentAt: new Date(),
      providerMessageId: result.providerMessageId,
      providerResponse: JSON.stringify(result.response ?? {}),
      error: null,
    },
  });

  await prisma.emailEvent.create({
    data: { emailMessageId, type: "sent", payload: JSON.stringify({ providerMessageId: result.providerMessageId }) },
  });

  await prisma.lead.update({
    where: { id: message.leadId },
    data: {
      lastContactedAt: new Date(),
      status: message.lead.status === "QUALIFIED" ? "CONTACTED" : message.lead.status,
    },
  });

  await logActivity({ action: "email_sent", leadId: message.leadId, campaignId: message.campaignId ?? undefined, meta: { type: message.type, variant: message.variant } });

  if (message.type === "INITIAL") {
    await scheduleFollowupsForLead(message.leadId, message.campaignId, emailMessageId);
  }

  return { sent: true };
}
