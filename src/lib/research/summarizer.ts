import { completeJson } from "@/lib/ai/client";
import { NO_HALLUCINATION_RULE, CULTTWENTY_POSITIONING } from "@/lib/ai/prompts";
import type { LeadContext, OutreachAngle } from "@/types/domain";

export type ResearchSummaryResult = {
  whatWeKnow: string;
  whatTheyMayNeed: string;
  whyCulttwenty: string;
  outreachAngle: string;
  angle: OutreachAngle;
  model: string;
};

const ANGLE_LABELS: Record<OutreachAngle, string> = {
  PRODUCT_LAUNCH: "Your next launch could be pushed visually.",
  BRAND: "Your brand has room for a stronger visual campaign.",
  CONTENT: "Your team could scale content without scaling production overhead.",
  AI: "We combine traditional production with AI-native workflows.",
  RECRUITING: "Your employer brand could communicate the culture more effectively.",
  DIGITAL: "Your campaign could be extended into a stronger digital experience.",
}

function pickAngleFromFacts(facts: LeadContext["facts"]): OutreachAngle {
  const categories = facts.map((f) => f.category);
  const text = facts.map((f) => f.factText.toLowerCase()).join(" ");

  if (categories.includes("launch")) return "PRODUCT_LAUNCH";
  if (text.includes("hiring") || text.includes("recruiting") || text.includes("careers")) return "RECRUITING";
  if (text.includes("e-commerce") || text.includes("digital") || text.includes("app")) return "DIGITAL";
  if (categories.includes("recent_campaign")) return "BRAND";
  if (categories.includes("social") || categories.includes("marketing_activity")) return "CONTENT";
  return "BRAND";
}

function buildMockSummary(context: LeadContext): ResearchSummaryResult {
  const angle = pickAngleFromFacts(context.facts);

  const knownFacts = context.facts.slice(0, 4).map((f) => f.factText);
  const whatWeKnow =
    knownFacts.length > 0
      ? knownFacts.join(" ")
      : `Limited public research is available for ${context.companyName} beyond basic company details.`;

  const needFactsByAngle: Record<OutreachAngle, string> = {
    PRODUCT_LAUNCH: "Campaign assets, product visuals and launch content to support the new release.",
    BRAND: "A stronger, more consistent visual campaign across their brand touchpoints.",
    CONTENT: "A scalable way to produce ongoing content without growing an internal production team.",
    AI: "A production partner who can combine traditional craft with AI-native speed.",
    RECRUITING: "Employer branding content that communicates culture more effectively.",
    DIGITAL: "A stronger digital experience to extend their campaign work online.",
  };

  const whyCulttwenty =
    "CultTwenty can combine film, design, AI and 3D into a single creative production, which fits a company with this profile.";

  return {
    whatWeKnow,
    whatTheyMayNeed: needFactsByAngle[angle],
    whyCulttwenty,
    outreachAngle: ANGLE_LABELS[angle],
    angle,
    model: "mock",
  };
}

export async function generateResearchSummary(context: LeadContext): Promise<ResearchSummaryResult> {
  if (context.facts.length === 0) {
    return {
      whatWeKnow: `No verifiable public facts were found for ${context.companyName} yet.`,
      whatTheyMayNeed: "UNKNOWN — insufficient research to determine a creative need.",
      whyCulttwenty: "UNKNOWN — not enough context to make a grounded case yet.",
      outreachAngle: "UNKNOWN",
      angle: "BRAND",
      model: "insufficient-data",
    };
  }

  const system = `You are a research analyst for CultTwenty, a creative production company. ${NO_HALLUCINATION_RULE}\n${CULTTWENTY_POSITIONING}\n\nGiven a list of verified facts about a company, produce a short research summary. Respond as strict JSON with keys: whatWeKnow (1-2 sentences, only restating/synthesizing given facts), whatTheyMayNeed (1 sentence, a plausible creative need inferred from the facts), whyCulttwenty (1 sentence connecting the need to CultTwenty's capabilities), outreachAngle (1 short sentence framing the angle), angle (one of: PRODUCT_LAUNCH, BRAND, CONTENT, AI, RECRUITING, DIGITAL).`;

  const user = JSON.stringify({
    company: context.companyName,
    industry: context.industry,
    country: context.country,
    facts: context.facts.map((f) => ({ text: f.factText, confidence: f.confidence, category: f.category })),
  });

  const result = await completeJson<{
    whatWeKnow: string;
    whatTheyMayNeed: string;
    whyCulttwenty: string;
    outreachAngle: string;
    angle: OutreachAngle;
  }>({ system, user });

  if (!result) {
    return buildMockSummary(context);
  }

  const validAngles: OutreachAngle[] = ["PRODUCT_LAUNCH", "BRAND", "CONTENT", "AI", "RECRUITING", "DIGITAL"];
  const angle = validAngles.includes(result.angle) ? result.angle : pickAngleFromFacts(context.facts);

  return {
    whatWeKnow: result.whatWeKnow || buildMockSummary(context).whatWeKnow,
    whatTheyMayNeed: result.whatTheyMayNeed || buildMockSummary(context).whatTheyMayNeed,
    whyCulttwenty: result.whyCulttwenty || buildMockSummary(context).whyCulttwenty,
    outreachAngle: result.outreachAngle || ANGLE_LABELS[angle],
    angle,
    model: "openai",
  };
}
