import { prisma } from "@/lib/prisma";
import { mockEmailProvider } from "@/lib/email/providers/mock";
import { resendEmailProvider } from "@/lib/email/providers/resend";
import { sendgridEmailProvider } from "@/lib/email/providers/sendgrid";
import { smtpEmailProvider } from "@/lib/email/providers/smtp";
import { outlookEmailProvider } from "@/lib/email/providers/outlook";
import type { EmailProvider } from "@/lib/email/types";

const PROVIDERS: Record<string, EmailProvider> = {
  mock: mockEmailProvider,
  resend: resendEmailProvider,
  sendgrid: sendgridEmailProvider,
  smtp: smtpEmailProvider,
  outlook: outlookEmailProvider,
};

/**
 * The active provider is a Settings row in the DB (configurable from the
 * Settings UI, spec section 36), falling back to the mock provider so the
 * app never crashes if Settings hasn't been initialized.
 */
export async function getActiveEmailProvider(): Promise<EmailProvider> {
  const settings = await prisma.settings.findUnique({ where: { id: "default" } });
  const key = settings?.emailProvider ?? "mock";
  return PROVIDERS[key] ?? mockEmailProvider;
}

export function getEmailProviderByName(name: string): EmailProvider {
  return PROVIDERS[name] ?? mockEmailProvider;
}
