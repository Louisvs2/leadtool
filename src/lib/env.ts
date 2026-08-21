import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  AUTH_URL: z.string().optional(),

  ADMIN_EMAIL: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),

  OPENAI_API_KEY: z.string().optional().default(""),
  OPENAI_MODEL: z.string().optional().default("gpt-4.1-mini"),

  EMAIL_PROVIDER: z.enum(["mock", "resend", "sendgrid", "smtp"]).optional().default("mock"),
  RESEND_API_KEY: z.string().optional().default(""),
  SENDGRID_API_KEY: z.string().optional().default(""),
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.string().optional().default("587"),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASSWORD: z.string().optional().default(""),
  SMTP_SECURE: z.string().optional().default("false"),
  INBOUND_WEBHOOK_SECRET: z.string().optional().default(""),

  LEAD_DISCOVERY_PROVIDER: z.enum(["demo", "custom"]).optional().default("demo"),

  CRON_SECRET: z.string().optional().default(""),
});

// process.env access is guarded so this module can be imported from both
// server components and route handlers without throwing during build.
function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration. Check your .env against .env.example.");
  }
  return parsed.data;
}

export const env = loadEnv();

export const isAiConfigured = () => Boolean(env.OPENAI_API_KEY);
export const isEmailProviderConfigured = () => {
  switch (env.EMAIL_PROVIDER) {
    case "resend":
      return Boolean(env.RESEND_API_KEY);
    case "sendgrid":
      return Boolean(env.SENDGRID_API_KEY);
    case "smtp":
      return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD);
    default:
      return true; // mock is always "configured"
  }
};
