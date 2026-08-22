import OpenAI from "openai";
import { getEffectiveSecrets } from "@/lib/secrets";

export async function getOpenAI(): Promise<OpenAI | null> {
  const secrets = await getEffectiveSecrets();
  if (!secrets.openaiApiKey) return null;
  // Constructed fresh per call (not module-cached) so a key saved via
  // Settings → API Keys takes effect immediately, without a redeploy.
  return new OpenAI({ apiKey: secrets.openaiApiKey });
}

/**
 * Calls the model with a JSON-schema-constrained response and parses it.
 * Returns null (never throws into the caller) so every call site can fall
 * back to deterministic mock logic — a live API outage must never lose a lead.
 */
export async function completeJson<T>(params: {
  system: string;
  user: string;
  temperature?: number;
}): Promise<T | null> {
  const openai = await getOpenAI();
  if (!openai) return null;

  try {
    const secrets = await getEffectiveSecrets();
    const completion = await openai.chat.completions.create({
      model: secrets.openaiModel,
      temperature: params.temperature ?? 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.user },
      ],
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) return null;
    return JSON.parse(content) as T;
  } catch (error) {
    console.error("OpenAI call failed, falling back to deterministic mode:", error);
    return null;
  }
}
