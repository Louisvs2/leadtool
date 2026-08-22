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
  // Some hosts (e.g. Vercel) set a variable left blank in their dashboard as
  // an actual empty string rather than omitting it — treat "" as unset so
  // .optional()/.default() fields (including enums) behave the same either way.
  const cleaned = Object.fromEntries(
    Object.entries(process.env).map(([key, value]) => [key, value === "" ? undefined : value]),
  );
  const parsed = envSchema.safeParse(cleaned);
  if (!parsed.success) {
    console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration. Check your .env against .env.example.");
  }
  return parsed.data;
}

export const env = loadEnv();

// isAiConfigured / isEmailProviderConfigured live in @/lib/secrets — they
// need to check Settings (DB) first, not just these env fallbacks.
