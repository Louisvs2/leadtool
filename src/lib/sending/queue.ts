import { prisma } from "@/lib/prisma";
import { sendEmailMessage } from "@/lib/sending/dispatcher";

/**
 * Dispatches EmailMessages that are QUEUED and due (scheduledAt <= now).
 * The actual pacing/rate-limiting was already baked into each message's
 * scheduledAt by computeSendSchedule — this just fires whatever is due,
 * so it's safe to call frequently (e.g. every minute via cron/polling)
 * without causing a burst send.
 */
export async function processSendQueue(batchSize = 10) {
  const due = await prisma.emailMessage.findMany({
    where: { status: "QUEUED", scheduledAt: { lte: new Date() } },
    orderBy: { scheduledAt: "asc" },
    take: batchSize,
    select: { id: true },
  });

  let sent = 0;
  let failed = 0;
  let retried = 0;

  for (const message of due) {
    const result = await sendEmailMessage(message.id);
    if (result.sent) sent += 1;
    else if (result.willRetry) retried += 1;
    else failed += 1;
  }

  const remainingQueued = await prisma.emailMessage.count({ where: { status: "QUEUED" } });

  return { processedThisBatch: due.length, sent, failed, retried, remainingQueued };
}
