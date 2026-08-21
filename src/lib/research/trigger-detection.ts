import type { WebsiteSnapshot } from "@/lib/research/website-fetcher";
import type { FactCategory, ResearchFactInput } from "@/types/domain";

// Keyword groups per spec section 10. Detection is purely lexical against
// text we actually fetched/imported — no invented trigger is ever produced.
// `phrase` is a natural noun phrase (grammatically drops into both fact
// sentences and outreach copy, e.g. "...had an idea around {phrase}").
const TRIGGER_KEYWORDS: { pattern: RegExp; phrase: string; category: FactCategory }[] = [
  { pattern: /\bnew (product|collection|line)\b/i, phrase: "a new product or collection launch", category: "launch" },
  { pattern: /\blaunch(ing|ed|es)?\b/i, phrase: "recent launch activity", category: "launch" },
  { pattern: /\bcampaign\b/i, phrase: "an active marketing campaign", category: "recent_campaign" },
  { pattern: /\brebrand(ing)?\b/i, phrase: "a rebranding effort", category: "recent_campaign" },
  { pattern: /\bexpansion|expanding\b/i, phrase: "an expansion into new markets", category: "marketing_activity" },
  { pattern: /\bnew store|new (flagship|location|branch)\b/i, phrase: "a new store or location opening", category: "marketing_activity" },
  { pattern: /\bfunding|series [a-e]|investment round\b/i, phrase: "a recent funding round", category: "marketing_activity" },
  { pattern: /\bwe('|’)re hiring|now hiring|join our team|careers\b/i, phrase: "an active recruiting push", category: "marketing_activity" },
  { pattern: /\bevent|festival|pop-?up\b/i, phrase: "an upcoming event or activation", category: "marketing_activity" },
  { pattern: /\bsustainab|responsib(ility|le)\b/i, phrase: "a sustainability-focused campaign", category: "marketing_activity" },
];

export function detectTriggersFromText(text: string): { phrase: string; category: FactCategory }[] {
  const found: { phrase: string; category: FactCategory }[] = [];
  const seen = new Set<string>();
  for (const { pattern, phrase, category } of TRIGGER_KEYWORDS) {
    if (pattern.test(text) && !seen.has(phrase)) {
      found.push({ phrase, category });
      seen.add(phrase);
    }
  }
  return found;
}

/** Priority order for picking the single best trigger to lead outreach copy with. */
const CATEGORY_PRIORITY: FactCategory[] = ["launch", "recent_campaign", "marketing_activity"];

export function pickPrimaryTrigger(texts: (string | null | undefined)[]): { phrase: string; category: FactCategory } | null {
  const combined = texts.filter(Boolean).join(" ");
  const found = detectTriggersFromText(combined);
  if (found.length === 0) return null;
  for (const category of CATEGORY_PRIORITY) {
    const match = found.find((f) => f.category === category);
    if (match) return match;
  }
  return found[0];
}

export function factsFromWebsiteSnapshot(snapshot: WebsiteSnapshot): ResearchFactInput[] {
  if (!snapshot.ok) return [];

  const facts: ResearchFactInput[] = [];

  if (snapshot.metaDescription) {
    facts.push({
      factText: `Company website describes itself as: "${snapshot.metaDescription}"`,
      sourceUrl: snapshot.url,
      confidence: "MEDIUM",
      category: "website_quality",
    });
  }

  if (snapshot.headings.length > 0) {
    facts.push({
      factText: `Homepage headline content: ${snapshot.headings.slice(0, 4).join(" / ")}`,
      sourceUrl: snapshot.url,
      confidence: "MEDIUM",
      category: "website_quality",
    });
  }

  facts.push({
    factText: snapshot.usesHttps
      ? "Website is served over HTTPS."
      : "Website is not served over HTTPS (no valid SSL detected).",
    sourceUrl: snapshot.url,
    confidence: "HIGH",
    category: "website_quality",
  });

  if (snapshot.hasSocialLinks) {
    facts.push({
      factText: "Website links to active social media profiles (Instagram/LinkedIn/TikTok/YouTube/Facebook).",
      sourceUrl: snapshot.url,
      confidence: "HIGH",
      category: "social",
    });
  }

  if (snapshot.hasEcommerce) {
    facts.push({
      factText: "Website includes e-commerce / online shop functionality.",
      sourceUrl: snapshot.url,
      confidence: "HIGH",
      category: "marketing_activity",
    });
  }

  const combinedText = `${snapshot.title ?? ""} ${snapshot.metaDescription ?? ""} ${snapshot.headings.join(" ")} ${snapshot.visibleText}`;
  const triggers = detectTriggersFromText(combinedText);
  for (const trigger of triggers) {
    facts.push({
      factText: `Public website content suggests ${trigger.phrase}.`,
      sourceUrl: snapshot.url,
      confidence: "LOW",
      category: trigger.category,
    });
  }

  return facts;
}
