import { completeJson } from "@/lib/ai/client";
import { NO_HALLUCINATION_RULE, CULTTWENTY_POSITIONING, EMAIL_TONE_RULES } from "@/lib/ai/prompts";
import { wordCount } from "@/lib/utils";
import type { LeadContext, EmailVariantKey } from "@/types/domain";

export type EmailType = "INITIAL" | "FOLLOWUP_1" | "FOLLOWUP_2" | "FOLLOWUP_3";

export type ResearchSummaryLike = {
  whatWeKnow: string;
  whatTheyMayNeed: string;
  whyCulttwenty: string;
  outreachAngle: string;
  angle: string;
};

export type SenderSettings = {
  senderName: string;
  pitchUrl: string;
  positioning: string;
  capabilities: string;
  signature: string;
  unsubscribeText: string;
};

export type GeneratedEmail = {
  subject: string;
  body: string;
  angle: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  sources: string[];
  model: string;
};

const VARIANT_STYLE: Record<EmailVariantKey, { label: string; instruction: string }> = {
  A: {
    label: "DIRECT",
    instruction: "Short and direct. Get straight to the specific observation and the idea. Minimal setup.",
  },
  B: {
    label: "CREATIVE",
    instruction: "A little bolder and more brand-forward — lead with a sharper creative observation about their brand or work.",
  },
  C: {
    label: "CONSULTATIVE",
    instruction: "Frame it around a concrete business problem or opportunity the trigger implies, positioned as a thought partner rather than a vendor.",
  },
};

const WORD_LIMITS: Record<EmailType, [number, number]> = {
  INITIAL: [60, 130],
  FOLLOWUP_1: [20, 70],
  FOLLOWUP_2: [20, 70],
  FOLLOWUP_3: [20, 70],
};

function firstName(name: string | null): string {
  if (!name) return "there";
  return name.trim().split(/\s+/)[0];
}

const GERMAN_SPEAKING_COUNTRIES = new Set([
  "germany",
  "deutschland",
  "austria",
  "österreich",
  "oesterreich",
  "switzerland",
  "schweiz",
]);

function isGermanSpeaking(country: string | null): boolean {
  if (!country) return false;
  return GERMAN_SPEAKING_COUNTRIES.has(country.trim().toLowerCase());
}

function buildSources(context: LeadContext): string[] {
  const urls = context.facts.map((f) => f.sourceUrl).filter((u): u is string => Boolean(u));
  return Array.from(new Set(urls));
}

function mockInitialEmail(context: LeadContext, variant: EmailVariantKey, summary: ResearchSummaryLike, sender: SenderSettings): GeneratedEmail {
  const name = firstName(context.contactName);
  const hasTrigger = context.triggerText && !context.triggerText.startsWith("UNKNOWN");
  const german = isGermanSpeaking(context.country);

  let body: string;
  let subject: string;

  if (german) {
    const observation = hasTrigger ? context.triggerText! : `wie ${context.companyName} das Thema visueller Content aktuell angeht`;
    if (variant === "A") {
      body = `Hallo ${name},\n\nich bin auf ${observation} gestoßen und hatte eine Idee, wie man das visuell noch stärker umsetzen könnte. Wir sind CultTwenty — eine Kreativproduktion aus Film, Design, KI und 3D.\n\nEin kurzer Überblick über unsere Arbeit: ${sender.pitchUrl}\n\nFalls das in diesem Jahr relevant ist, teile ich gerne ein paar konkrete Ideen.\n\n${sender.signature}`;
      subject = `Ein kreativer Gedanke für ${context.companyName}`;
    } else if (variant === "B") {
      body = `Hallo ${name},\n\n${observation.charAt(0).toUpperCase()}${observation.slice(1)} — das hat mich auf die Idee gebracht, dass da visuell noch mehr geht. CultTwenty produziert Film, Design, KI und 3D für Marken, die bei Kampagnen wie dieser schnell unterwegs sind.\n\nEin kurzer Einblick in unsere Arbeit: ${sender.pitchUrl}\n\nLohnt sich ein kurzes Gespräch, falls größere Kreativprojekte anstehen.\n\n${sender.signature}`;
      subject = `${context.companyName} — eine schärfere visuelle Richtung`;
    } else {
      body = `Hallo ${name},\n\nangesichts von ${observation} entsteht wahrscheinlich bald echter Produktionsbedarf — Assets, Content, vielleicht mehr. Wir helfen Marken wie ${context.companyName} dabei, ohne ein internes Team aufzubauen, und bringen Film, Design, KI und 3D unter einem Dach zusammen.\n\nÜberblick hier: ${sender.pitchUrl}\n\nGerne für ein kurzes Gespräch offen, falls hilfreich.\n\n${sender.signature}`;
      subject = `Die Produktionsseite eurer nächsten Kampagne`;
    }
  } else {
    const observation = hasTrigger ? context.triggerText! : `how ${context.companyName} is approaching visual content right now`;
    if (variant === "A") {
      const opener = `I came across ${observation} and had an idea for how it could be pushed visually.`;
      body = `Hi ${name},\n\n${opener} We're CultTwenty — a creative production company combining film, design, AI and 3D.\n\nA quick overview of our work: ${sender.pitchUrl}\n\nIf that's relevant this year, happy to share a few concrete ideas.\n\n${sender.signature}`;
      subject = `A creative thought for ${context.companyName}`;
    } else if (variant === "B") {
      const opener = `${observation.charAt(0).toUpperCase()}${observation.slice(1)} — and it made me think there's room to push the visual side further.`;
      body = `Hi ${name},\n\n${opener} CultTwenty produces film, design, AI and 3D work for brands moving fast on campaigns like this.\n\nHere's a quick look at what we do: ${sender.pitchUrl}\n\nWorth a short conversation if you're planning bigger creative work this year.\n\n${sender.signature}`;
      subject = `${context.companyName} — a sharper visual direction`;
    } else {
      const opener = `Given ${observation}, there's likely a real production need coming up — assets, content, maybe more.`;
      body = `Hi ${name},\n\n${opener} We help brands like ${context.companyName} handle that without scaling an internal team, combining film, design, AI and 3D under one roof.\n\nOverview here: ${sender.pitchUrl}\n\nOpen to a short call if useful.\n\n${sender.signature}`;
      subject = `Handling the production side of your next campaign`;
    }
  }

  return {
    subject,
    body,
    angle: summary.angle,
    confidence: hasTrigger ? "MEDIUM" : "LOW",
    sources: buildSources(context),
    model: "mock",
  };
}

function mockFollowupEmail(context: LeadContext, sequenceNumber: number, sender: SenderSettings, previousSubject: string): GeneratedEmail {
  const name = firstName(context.contactName);
  const german = isGermanSpeaking(context.country);
  let body: string;
  const subject = `Re: ${previousSubject}`;

  if (german) {
    if (sequenceNumber === 1) {
      body = `Hallo ${name},\n\nwollte das nur nochmal nach oben holen, falls es untergegangen ist.\n\n${sender.signature}`;
    } else if (sequenceNumber === 2) {
      const hasTrigger = context.triggerText && !context.triggerText.startsWith("UNKNOWN");
      const extra = hasTrigger
        ? `angesichts von ${context.triggerText} könnte es eine gute Gelegenheit sein, Kampagnen-Assets darum herum aufzubauen`
        : `es könnte eine gute Gelegenheit sein, Film, Design und KI für eure nächste Kampagne zusammenzubringen`;
      body = `Hallo ${name},\n\nNoch ein Gedanke: ${extra}.\n\n${sender.pitchUrl}\n\n${sender.signature}`;
    } else {
      body = `Hallo ${name},\n\nletzte Nachricht von mir — falls Kreativproduktion gerade kein Thema ist, alles gut.\n\n${sender.signature}`;
    }
  } else {
    if (sequenceNumber === 1) {
      body = `Hi ${name},\n\nJust wanted to bump this in case it got buried.\n\n${sender.signature}`;
    } else if (sequenceNumber === 2) {
      const hasTrigger = context.triggerText && !context.triggerText.startsWith("UNKNOWN");
      const extra = hasTrigger
        ? `given ${context.triggerText}, there could be a good opportunity to build campaign assets around it`
        : `there could be a good opportunity to bring film, design and AI together for your next campaign`;
      body = `Hi ${name},\n\nOne additional thought: ${extra}.\n\n${sender.pitchUrl}\n\n${sender.signature}`;
    } else {
      body = `Hi ${name},\n\nLast one from me — if creative production isn't on the agenda right now, no worries at all.\n\n${sender.signature}`;
    }
  }

  return {
    subject,
    body,
    angle: "BRAND",
    confidence: "MEDIUM",
    sources: buildSources(context),
    model: "mock",
  };
}

async function aiCompose(params: {
  context: LeadContext;
  summary: ResearchSummaryLike;
  variant: EmailVariantKey;
  emailType: EmailType;
  sender: SenderSettings;
  previousSubject?: string;
  sequenceNumber?: number;
}): Promise<GeneratedEmail | null> {
  const [minWords, maxWords] = WORD_LIMITS[params.emailType];
  const isFollowup = params.emailType !== "INITIAL";
  const writeInGerman = isGermanSpeaking(params.context.country);
  const languageInstruction = writeInGerman
    ? `Write the entire email — subject and body — in German. Use natural, professional business German (formal "Sie", not "Du").`
    : `Write the entire email — subject and body — in English.`;

  const system = `You write outbound email copy for CultTwenty, a creative production company. ${NO_HALLUCINATION_RULE}\n${CULTTWENTY_POSITIONING}\n${EMAIL_TONE_RULES}\n\n${languageInstruction}\n\n${
    isFollowup
      ? `This is follow-up #${params.sequenceNumber} in a sequence. It must NOT repeat the previous email's content — bring something new and small, stay low-pressure, and keep it noticeably shorter.`
      : `This is variant "${VARIANT_STYLE[params.variant].label}": ${VARIANT_STYLE[params.variant].instruction}`
  }\n\nBody must be ${minWords}-${maxWords} words. Decide yourself whether including the pitch link (${params.sender.pitchUrl}) makes sense for this specific message — if you include it, put the bare URL on its own line. End with just the sender's first name (no company boilerplate) unless a short signature is more natural. Respond as strict JSON: {"subject": string, "body": string}.`;

  const user = JSON.stringify({
    company: params.context.companyName,
    industry: params.context.industry,
    country: params.context.country,
    contact: { name: params.context.contactName, role: params.context.contactRole },
    trigger: params.context.triggerText,
    research: params.summary,
    previousSubject: params.previousSubject,
    senderFirstName: params.sender.senderName,
  });

  const result = await completeJson<{ subject: string; body: string }>({ system, user, temperature: 0.6 });
  if (!result?.subject || !result?.body) return null;

  return {
    subject: result.subject,
    body: result.body,
    angle: params.summary.angle,
    confidence: params.context.triggerText ? "MEDIUM" : "LOW",
    sources: buildSources(params.context),
    model: "openai",
  };
}

export async function generateInitialEmailVariant(
  context: LeadContext,
  summary: ResearchSummaryLike,
  variant: EmailVariantKey,
  sender: SenderSettings,
): Promise<GeneratedEmail> {
  const ai = await aiCompose({ context, summary, variant, emailType: "INITIAL", sender });
  return ai ?? mockInitialEmail(context, variant, summary, sender);
}

export async function generateAllEmailVariants(
  context: LeadContext,
  summary: ResearchSummaryLike,
  sender: SenderSettings,
): Promise<Record<EmailVariantKey, GeneratedEmail>> {
  const [a, b, c] = await Promise.all([
    generateInitialEmailVariant(context, summary, "A", sender),
    generateInitialEmailVariant(context, summary, "B", sender),
    generateInitialEmailVariant(context, summary, "C", sender),
  ]);
  return { A: a, B: b, C: c };
}

export async function generateFollowupEmail(
  context: LeadContext,
  summary: ResearchSummaryLike,
  sequenceNumber: 1 | 2 | 3,
  sender: SenderSettings,
  previousSubject: string,
): Promise<GeneratedEmail> {
  const emailType = (`FOLLOWUP_${sequenceNumber}` as EmailType);
  const ai = await aiCompose({ context, summary, variant: "A", emailType, sender, previousSubject, sequenceNumber });
  return ai ?? mockFollowupEmail(context, sequenceNumber, sender, previousSubject);
}

export function withinWordLimit(body: string, type: EmailType): boolean {
  const [min, max] = WORD_LIMITS[type];
  const count = wordCount(body);
  return count >= min - 5 && count <= max + 15; // small tolerance
}

export { WORD_LIMITS };
