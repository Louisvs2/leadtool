import { z } from "zod";

export const leadFinderCriteriaSchema = z.object({
  countries: z.array(z.string()).default([]),
  industries: z.array(z.string()).default([]),
  companySizeMin: z.coerce.number().int().min(0).default(50),
  companySizeMax: z.coerce.number().int().min(0).default(5000),
  leadCount: z.coerce.number().int().min(1).max(500).default(20),
  minQuality: z.coerce.number().int().min(0).max(100).default(70),
  keywords: z.array(z.string()).default([]),
});

export const manualLeadSchema = z.object({
  companyName: z.string().min(1),
  website: z.string().optional(),
  industry: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  companySizeMin: z.coerce.number().int().min(0).optional(),
  companySizeMax: z.coerce.number().int().min(0).optional(),
  description: z.string().optional(),
  contactName: z.string().optional(),
  contactRole: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  linkedinUrl: z.string().optional(),
  opportunityValue: z.coerce.number().int().optional(),
});

export const leadUpdateSchema = z.object({
  status: z
    .enum([
      "RESEARCH",
      "QUALIFIED",
      "CONTACTED",
      "REPLIED",
      "CALL",
      "PROPOSAL",
      "NEGOTIATION",
      "WON",
      "LOST",
      "DO_NOT_CONTACT",
      "REJECTED",
    ])
    .optional(),
  opportunityValue: z.coerce.number().int().nullable().optional(),
  nextFollowUpAt: z.string().datetime().nullable().optional(),

  // Company/contact edits — same shape as manualLeadSchema's fields, all
  // optional so a status-only PATCH (the common case) never has to send them.
  companyName: z.string().min(1).optional(),
  website: z.string().optional(),
  industry: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  companySizeMin: z.coerce.number().int().min(0).optional(),
  companySizeMax: z.coerce.number().int().min(0).optional(),
  description: z.string().optional(),
  contactName: z.string().optional(),
  contactRole: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  linkedinUrl: z.string().optional(),
});

export const noteSchema = z.object({
  body: z.string().min(1),
});
