import { z } from "zod";

export const settingsUpdateSchema = z.object({
  companyName: z.string().min(1).optional(),
  companyWebsite: z.string().optional(),
  positioning: z.string().optional(),
  capabilities: z.string().optional(),
  targetProjectSize: z.string().optional(),

  senderName: z.string().min(1).optional(),
  senderEmail: z.string().email().optional(),
  replyTo: z.string().email().optional(),
  signature: z.string().optional(),

  pitchUrl: z.string().optional(),

  emailProvider: z.enum(["mock", "resend", "sendgrid", "smtp"]).optional(),

  // Secrets: only set when the caller sends a non-empty string — the API
  // route strips empty/undefined values before writing so re-saving other
  // tabs never wipes a previously-configured key.
  openaiApiKey: z.string().min(1).optional(),
  resendApiKey: z.string().min(1).optional(),
  sendgridApiKey: z.string().min(1).optional(),
  smtpHost: z.string().min(1).optional(),
  smtpPort: z.string().min(1).optional(),
  smtpUser: z.string().min(1).optional(),
  smtpPassword: z.string().min(1).optional(),
  smtpSecure: z.boolean().optional(),
  inboundWebhookSecret: z.string().min(1).optional(),
  cronSecret: z.string().min(1).optional(),

  sendWindowStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  sendWindowEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  sendDaysOfWeek: z.string().optional(),
  maxSendsPerDay: z.coerce.number().int().min(1).optional(),
  minDelaySeconds: z.coerce.number().int().min(5).optional(),
  maxDelaySeconds: z.coerce.number().int().min(5).optional(),

  followup1Days: z.coerce.number().int().min(1).optional(),
  followup2Days: z.coerce.number().int().min(1).optional(),
  followup3Days: z.coerce.number().int().min(1).optional(),
  followupsEnabled: z.boolean().optional(),

  unsubscribeText: z.string().optional(),
});
