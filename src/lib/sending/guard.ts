import { prisma } from "@/lib/prisma";

export type SendGuardResult = { allowed: true } | { allowed: false; reason: string };

/**
 * Last-line-of-defense check before any real send. Demo leads and
 * suppressed addresses must never receive an actual email, regardless of
 * what the UI allowed upstream (spec sections 27 & 46).
 */
export async function assertSendable(params: {
  toEmail: string;
  isDemo: boolean;
}): Promise<SendGuardResult> {
  if (params.isDemo) {
    return { allowed: false, reason: "Lead is marked as DEMO DATA and can never be sent to." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(params.toEmail)) {
    return { allowed: false, reason: "INVALID EMAIL" };
  }

  const suppressed = await prisma.suppressionEntry.findUnique({ where: { email: params.toEmail.toLowerCase() } });
  if (suppressed) {
    return { allowed: false, reason: `Address is on the suppression list (${suppressed.reason}).` };
  }

  return { allowed: true };
}

export async function addToSuppressionList(email: string, reason: string, note?: string) {
  await prisma.suppressionEntry.upsert({
    where: { email: email.toLowerCase() },
    update: { reason, note },
    create: { email: email.toLowerCase(), reason, note },
  });
}

export async function isSuppressed(email: string): Promise<boolean> {
  const entry = await prisma.suppressionEntry.findUnique({ where: { email: email.toLowerCase() } });
  return Boolean(entry);
}
