import { completeJson } from "@/lib/ai/client";
import { BANNED_PHRASES } from "@/lib/ai/prompts";
import { wordCount } from "@/lib/utils";
import { WORD_LIMITS, type EmailType } from "@/lib/email/generator";
import type { LeadContext } from "@/types/domain";

export type QualityCheckField = { pass: boolean; note: string };

export type QualityCheckResult = {
  factuality: QualityCheckField;
  personalization: QualityCheckField;
  length: QualityCheckField;
  tone: QualityCheckField;
  cta: QualityCheckField;
  spam: QualityCheckField;
  warnings: string[];
  overallPass: boolean;
};

const GENERIC_FLATTERY = [
  /love (your|the) (website|brand|company)/i,
  /amazing (company|brand|team)/i,
  /impressive (company|website|brand)/i,
  /congratulations on your (amazing|great|impressive)/i,
];

const SPAM_SIGNALS = [
  /\bfree\b.*\bguarantee/i,
  /act now/i,
  /click here/i,
  /100% free/i,
  /\$\$\$/,
  /buy now/i,
  /limited time offer/i,
  /!!!/,
];

const LOW_PRESSURE_CTA_SIGNALS = [
  /happy to/i,
  /open to/i,
  /worth a/i,
  /let me know/i,
  /if (useful|relevant|helpful)/i,
  /no worries/i,
  /\?\s*$/,
];

function checkLength(body: string, type: EmailType): QualityCheckField {
  const [min, max] = WORD_LIMITS[type];
  const count = wordCount(body);
  const pass = count >= min - 10 && count <= max + 20;
  return {
    pass,
    note: `${count} words (target ${min}-${max}).`,
  };
}

function checkTone(body: string): QualityCheckField {
  const hits = BANNED_PHRASES.filter((phrase) => body.toLowerCase().includes(phrase.toLowerCase()));
  return {
    pass: hits.length === 0,
    note: hits.length === 0 ? "No banned/generic sales phrases found." : `Contains banned phrasing: ${hits.join(", ")}`,
  };
}

function checkSpam(body: string, subject: string): QualityCheckField {
  const text = `${subject} ${body}`;
  const hits = SPAM_SIGNALS.filter((re) => re.test(text));
  const allCapsWords = (body.match(/\b[A-Z]{4,}\b/g) ?? []).length;
  const pass = hits.length === 0 && allCapsWords <= 1;
  return {
    pass,
    note: pass ? "No spammy language detected." : "Contains spam-trigger language or excessive caps/punctuation.",
  };
}

function checkCta(body: string): QualityCheckField {
  const hasCta = LOW_PRESSURE_CTA_SIGNALS.some((re) => re.test(body));
  return {
    pass: hasCta,
    note: hasCta ? "Clear, low-pressure call to action present." : "No clear low-pressure CTA detected.",
  };
}

function checkPersonalization(body: string, context: LeadContext): QualityCheckField {
  const mentionsCompany = body.toLowerCase().includes(context.companyName.toLowerCase());
  const genericFlattery = GENERIC_FLATTERY.some((re) => re.test(body));
  const hasGroundedDetail = context.facts.length > 0 || Boolean(context.triggerText);

  if (genericFlattery && !hasGroundedDetail) {
    return { pass: false, note: "Uses generic flattery without a grounded fact to back it up." };
  }
  return {
    pass: mentionsCompany,
    note: mentionsCompany ? "References the specific company." : "Does not reference the company by name — check personalization.",
  };
}

async function checkFactualityWithAi(body: string, context: LeadContext): Promise<QualityCheckField | null> {
  const system = `You are a strict fact-checker. Given a list of verified facts about a company and a draft outreach email, determine whether every specific factual claim in the email is supported by the facts. Respond as JSON: {"supported": boolean, "note": string (short)}.`;
  const user = JSON.stringify({
    facts: context.facts.map((f) => f.factText),
    trigger: context.triggerText,
    email: body,
  });
  const result = await completeJson<{ supported: boolean; note: string }>({ system, user, temperature: 0.1 });
  if (!result) return null;
  return { pass: result.supported, note: result.note };
}

export async function runEmailQualityCheck(params: {
  subject: string;
  body: string;
  type: EmailType;
  context: LeadContext;
}): Promise<QualityCheckResult> {
  const length = checkLength(params.body, params.type);
  const tone = checkTone(params.body);
  const spam = checkSpam(params.body, params.subject);
  const cta = checkCta(params.body);
  const personalization = checkPersonalization(params.body, params.context);

  const aiFactuality = await checkFactualityWithAi(params.body, params.context);
  const factuality: QualityCheckField =
    aiFactuality ?? {
      pass: true,
      note: "AI factuality check unavailable (no API key configured) — recommend a manual review before sending.",
    };

  const warnings: string[] = [];
  for (const [key, field] of Object.entries({ factuality, personalization, length, tone, cta, spam })) {
    if (!field.pass) warnings.push(`${key.toUpperCase()}: ${field.note}`);
  }

  return {
    factuality,
    personalization,
    length,
    tone,
    cta,
    spam,
    warnings,
    overallPass: warnings.length === 0,
  };
}
