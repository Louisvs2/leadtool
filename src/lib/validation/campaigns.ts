import { z } from "zod";

export const createCampaignSchema = z.object({
  name: z.string().min(1),
  leadIds: z.array(z.string()).min(1),
  angle: z.string().default("AUTO"),
  pitchUrl: z.string().optional(),
  minScore: z.coerce.number().int().min(0).max(100).default(70),
  includeBelowThreshold: z.boolean().default(false),
  targetCountries: z.string().optional(),
  targetIndustries: z.string().optional(),
});

export const campaignScheduleSchema = z.object({
  sendWindowStart: z.string().regex(/^\d{2}:\d{2}$/),
  sendWindowEnd: z.string().regex(/^\d{2}:\d{2}$/),
  sendDaysOfWeek: z.string().min(1),
  maxSendsPerDay: z.coerce.number().int().min(1).max(500),
  minDelaySeconds: z.coerce.number().int().min(5),
  maxDelaySeconds: z.coerce.number().int().min(5),
  followup1Days: z.coerce.number().int().min(1),
  followup2Days: z.coerce.number().int().min(1),
  followup3Days: z.coerce.number().int().min(1),
  followupsEnabled: z.boolean().default(true),
});

export const sendCampaignSchema = z.object({
  complianceConfirmed: z.literal(true),
});
