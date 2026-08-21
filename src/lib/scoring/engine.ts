import { scoreToGrade, isDoNotContact } from "@/lib/grade";
import { HIGH_BUDGET_INDUSTRIES } from "@/lib/constants";
import type { ResearchFactInput } from "@/types/domain";
import type { Grade } from "@prisma/client";

export type ScoringInput = {
  industry: string | null;
  companySizeMin: number | null;
  companySizeMax: number | null;
  facts: ResearchFactInput[];
  triggerText: string | null;
  hasContactName: boolean;
  hasContactRole: boolean;
  hasValidEmail: boolean;
  websiteUsesHttps: boolean | null;
  hasSocialPresence: boolean;
};

export type ScoreBreakdown = {
  budgetPotential: number;
  creativeNeed: number;
  brandQuality: number;
  marketingActivity: number;
  timing: number;
  contactQuality: number;
  total: number;
  grade: Grade;
  doNotContact: boolean;
};

function scoreBudgetPotential(input: ScoringInput): number {
  const size = input.companySizeMax ?? input.companySizeMin ?? 0;
  let score: number;
  if (size >= 1000) score = 25;
  else if (size >= 500) score = 22;
  else if (size >= 200) score = 18;
  else if (size >= 50) score = 14;
  else if (size > 0) score = 6;
  else score = 10; // unknown company size — neutral

  if (input.industry && HIGH_BUDGET_INDUSTRIES.has(input.industry)) {
    score = Math.min(25, score + 3);
  }
  return score;
}

function scoreCreativeNeed(input: ScoringInput): number {
  const relevantCategories = new Set(["launch", "recent_campaign", "marketing_activity"]);
  const relevantFacts = input.facts.filter((f) => relevantCategories.has(f.category));
  let score = 4 + relevantFacts.length * 4;
  if (input.triggerText) score += 4;
  return Math.min(20, score);
}

function scoreBrandQuality(input: ScoringInput): number {
  let score = 0;
  const websiteFacts = input.facts.filter((f) => f.category === "website_quality");
  if (websiteFacts.length > 0) score += 5;
  if (input.websiteUsesHttps) score += 5;
  if (input.hasSocialPresence) score += 5;
  return Math.min(15, score);
}

function scoreMarketingActivity(input: ScoringInput): number {
  const relevant = input.facts.filter((f) => f.category === "social" || f.category === "marketing_activity");
  return Math.min(15, relevant.length * 5);
}

function scoreTiming(input: ScoringInput): number {
  if (input.triggerText) return 15;
  const weakSignals = input.facts.filter((f) => f.category === "launch" || f.category === "recent_campaign");
  if (weakSignals.length > 0) return 9;
  return 3;
}

function scoreContactQuality(input: ScoringInput): number {
  let score = 0;
  if (input.hasContactName) score += 4;
  if (input.hasContactRole) score += 3;
  if (input.hasValidEmail) score += 3;
  return score;
}

/**
 * Deterministic, fully explainable lead scoring (spec section 9). Kept
 * rules-based rather than AI-generated so scores are reproducible and
 * auditable — the same inputs always produce the same score.
 */
export function computeLeadScore(input: ScoringInput): ScoreBreakdown {
  const budgetPotential = scoreBudgetPotential(input);
  const creativeNeed = scoreCreativeNeed(input);
  const brandQuality = scoreBrandQuality(input);
  const marketingActivity = scoreMarketingActivity(input);
  const timing = scoreTiming(input);
  const contactQuality = scoreContactQuality(input);

  const total = budgetPotential + creativeNeed + brandQuality + marketingActivity + timing + contactQuality;
  const grade = scoreToGrade(total);

  return {
    budgetPotential,
    creativeNeed,
    brandQuality,
    marketingActivity,
    timing,
    contactQuality,
    total,
    grade,
    doNotContact: isDoNotContact(total),
  };
}
