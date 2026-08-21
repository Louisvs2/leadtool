export type Confidence = "HIGH" | "MEDIUM" | "LOW";

export type FactCategory =
  | "marketing_activity"
  | "recent_campaign"
  | "launch"
  | "social"
  | "website_quality"
  | "trigger"
  | "other";

export type ResearchFactInput = {
  factText: string;
  sourceUrl: string | null;
  confidence: Confidence;
  category: FactCategory;
};

export type OutreachAngle = "PRODUCT_LAUNCH" | "BRAND" | "CONTENT" | "AI" | "RECRUITING" | "DIGITAL";

export type EmailVariantKey = "A" | "B" | "C";

export type LeadContext = {
  leadId: string;
  companyName: string;
  website: string | null;
  industry: string | null;
  country: string | null;
  city: string | null;
  companySizeLabel: string | null;
  companyDescription: string | null;
  contactName: string | null;
  contactRole: string | null;
  contactEmail: string | null;
  facts: ResearchFactInput[];
  triggerText: string | null;
};
