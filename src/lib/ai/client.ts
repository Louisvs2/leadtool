import OpenAI from "openai";
import { env, isAiConfigured } from "@/lib/env";

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI | null {
  if (!isAiConfigured()) return null;
  if (!client) {
    client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return client;
}

export const AI_MODEL = env.OPENAI_MODEL;

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
  const openai = getOpenAI();
  if (!openai) return null;

  try {
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
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
