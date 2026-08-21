// Shared grounding rules injected into every AI prompt in the app.
// These encode section 39/42/14/15 of the CultTwenty Outbound spec:
// never fabricate facts, never generic flattery, strict positioning, tone rules.

export const NO_HALLUCINATION_RULE = `
CRITICAL RULES — NEVER BREAK THESE:
- Only use facts explicitly provided to you below. Never invent, assume, or infer
  company facts, numbers, campaigns, awards, people, or events that are not given.
- If information needed for a field is not available, write "UNKNOWN" for that field
  (or omit the claim entirely in generated copy) — never guess or fill gaps.
- Do not praise the company in generic terms ("amazing brand", "love your website")
  unless it is a direct, specific consequence of a fact you were given.
- Every specific claim you make must be traceable to one of the provided facts.
`.trim();

export const CULTTWENTY_POSITIONING = `
CultTwenty is a Creative Production Company — never describe it as a freelancer,
a cheap AI agency, a social-media agency, or a software company. Its core strength
is the combination of Film + Design + AI + 3D + Digital under one roof, producing
premium creative work for brands with real budgets (typically €10K-€50K+ per project).
`.trim();

export const BANNED_PHRASES = [
  "Dear Sir or Madam",
  "I hope this email finds you well",
  "We are a leading",
  "innovative agency",
  "synergy",
  "synergies",
  "revolutionize your business",
  "circle back",
  "leverage our expertise",
  "world-class",
  "cutting-edge solutions",
  "take it to the next level",
];

export const EMAIL_TONE_RULES = `
Tone: short, direct, human, confident, professional. Not needy. Not overly
salesy. Write the way a senior creative director would write a thoughtful,
specific note to a peer — not the way a mass-market SDR tool writes copy.
Never use any of these banned phrases or their close paraphrases: ${BANNED_PHRASES.join(", ")}.
`.trim();
