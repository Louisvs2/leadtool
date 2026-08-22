import { env } from "@/lib/env";
import { getSettings } from "@/lib/settings";
import type { Settings } from "@prisma/client";

export type EffectiveSecrets = {
  openaiApiKey: string;
  openaiModel: string;
  emailProvider: string;
  resendApiKey: string;
  sendgridApiKey: string;
  smtp: {
    host: string;
    port: string;
    user: string;
    password: string;
    secure: boolean;
  };
  graph: {
    tenantId: string;
    clientId: string;
    clientSecret: string;
    mailbox: string;
  };
  inboundWebhookSecret: string;
  cronSecret: string;
};

/**
 * Single source of truth for every secret/API key the app uses. A value
 * saved in Settings (Admin → Settings → API Keys) always wins; an
 * environment variable is the fallback, so a deploy that still configures
 * everything via env vars keeps working unchanged. DATABASE_URL and
 * AUTH_SECRET are deliberately excluded — the app needs those before it
 * can even reach the database, so they can only ever be env vars.
 */
export async function getEffectiveSecrets(): Promise<EffectiveSecrets> {
  const settings = await getSettings();

  return {
    openaiApiKey: settings.openaiApiKey || env.OPENAI_API_KEY,
    openaiModel: env.OPENAI_MODEL,
    emailProvider: settings.emailProvider || env.EMAIL_PROVIDER,
    resendApiKey: settings.resendApiKey || env.RESEND_API_KEY,
    sendgridApiKey: settings.sendgridApiKey || env.SENDGRID_API_KEY,
    smtp: {
      host: settings.smtpHost || env.SMTP_HOST,
      port: settings.smtpPort || env.SMTP_PORT,
      user: settings.smtpUser || env.SMTP_USER,
      password: settings.smtpPassword || env.SMTP_PASSWORD,
      secure: settings.smtpPassword ? settings.smtpSecure : env.SMTP_SECURE === "true",
    },
    graph: {
      tenantId: settings.graphTenantId || env.GRAPH_TENANT_ID,
      clientId: settings.graphClientId || env.GRAPH_CLIENT_ID,
      clientSecret: settings.graphClientSecret || env.GRAPH_CLIENT_SECRET,
      mailbox: settings.graphMailbox || env.GRAPH_MAILBOX,
    },
    inboundWebhookSecret: settings.inboundWebhookSecret || env.INBOUND_WEBHOOK_SECRET,
    cronSecret: settings.cronSecret || env.CRON_SECRET,
  };
}

export async function isAiConfigured(): Promise<boolean> {
  const secrets = await getEffectiveSecrets();
  return Boolean(secrets.openaiApiKey);
}

export async function isEmailProviderConfigured(): Promise<boolean> {
  const secrets = await getEffectiveSecrets();
  switch (secrets.emailProvider) {
    case "resend":
      return Boolean(secrets.resendApiKey);
    case "sendgrid":
      return Boolean(secrets.sendgridApiKey);
    case "smtp":
      return Boolean(secrets.smtp.host && secrets.smtp.user && secrets.smtp.password);
    case "outlook":
      return Boolean(secrets.graph.tenantId && secrets.graph.clientId && secrets.graph.clientSecret && secrets.graph.mailbox);
    default:
      return true; // mock is always "configured"
  }
}

/** Last 4 characters only — safe to send to the browser as a "which key is this" hint. */
export function maskSecret(value: string | null | undefined): { configured: boolean; hint: string | null } {
  if (!value) return { configured: false, hint: null };
  const tail = value.slice(-4);
  return { configured: true, hint: `••••${tail}` };
}

export const SECRET_FIELDS = [
  "openaiApiKey",
  "resendApiKey",
  "sendgridApiKey",
  "smtpHost",
  "smtpUser",
  "smtpPassword",
  "graphTenantId",
  "graphClientId",
  "graphClientSecret",
  "inboundWebhookSecret",
  "cronSecret",
] as const;

export type MaskedSecrets = Record<(typeof SECRET_FIELDS)[number], ReturnType<typeof maskSecret>>;

/**
 * Strips every raw secret value out of a Settings row before it's ever
 * allowed to reach an API response or a Client Component prop — a Server
 * Component passing the raw Prisma row straight into a "use client"
 * component would otherwise leak every key into the browser's RSC payload.
 */
export function maskSettingsForClient(settings: Settings) {
  const rest: Record<string, unknown> = { ...settings };
  const secrets = {} as MaskedSecrets;
  for (const field of SECRET_FIELDS) {
    secrets[field] = maskSecret(settings[field]);
    delete rest[field];
  }
  return { settings: rest as Omit<Settings, (typeof SECRET_FIELDS)[number]>, secrets };
}
