import { completeJson } from "@/lib/ai/client";
import type { ReplyCategory } from "@prisma/client";

export type ReplyAnalysis = {
  category: ReplyCategory;
  isHot: boolean;
  summary: string;
  suggestedAction: string;
  suggestedReply: string | null;
};

const CATEGORY_KEYWORDS: [RegExp, ReplyCategory][] = [
  [/unsubscribe|remove me|opt.?out|stop (emailing|contacting)/i, "UNSUBSCRIBE"],
  [/out of (the )?office|automatic reply|auto-?reply|on vacation|currently away/i, "OUT_OF_OFFICE"],
  [/wrong (person|contact)|not (the right|my) (person|department)|please contact/i, "WRONG_PERSON"],
  [/f\*ck|screw off|stop spamming|harassment|do not contact again/i, "NEGATIVE"],
  [/not interested|no thanks|not for us|we('| a)re not looking/i, "NOT_INTERESTED"],
  [/not (right )?now|maybe (later|next|in)|revisit (this )?(later|in)|check back/i, "NOT_NOW"],
  [/(sounds|looks) (great|good|interesting)|let'?s (talk|chat|schedule|book)|call this week|when (are you|can we) (free|available)/i, "HOT_LEAD"],
  [/interested|tell me more|would like to (know|hear|learn) more/i, "INTERESTED"],
];

function classifyByKeywords(body: string): ReplyCategory {
  for (const [pattern, category] of CATEGORY_KEYWORDS) {
    if (pattern.test(body)) return category;
  }
  return "MAYBE";
}

function mockAnalysis(body: string): ReplyAnalysis {
  const category = classifyByKeywords(body);
  const isHot = category === "HOT_LEAD" || (category === "INTERESTED" && body.length < 400);

  const ACTION_BY_CATEGORY: Record<ReplyCategory, string> = {
    INTERESTED: "Reply with 2-3 concrete next steps or a scheduling link.",
    HOT_LEAD: "Respond promptly and propose a call this week.",
    MAYBE: "Follow up with a specific, low-effort next step.",
    NOT_NOW: "Note the timing and schedule a check-in for later.",
    NOT_INTERESTED: "Mark as lost and stop outreach.",
    WRONG_PERSON: "Ask for the correct contact, or research the right person.",
    OUT_OF_OFFICE: "Wait and retry after their return date if mentioned.",
    UNSUBSCRIBE: "Add to suppression list immediately and stop all outreach.",
    NEGATIVE: "Stop all outreach immediately and add to suppression list.",
    UNCATEGORIZED: "Review manually.",
  };

  return {
    category,
    isHot,
    summary: body.length > 220 ? `${body.slice(0, 220)}…` : body,
    suggestedAction: ACTION_BY_CATEGORY[category],
    suggestedReply: category === "INTERESTED" || category === "HOT_LEAD"
      ? "Thanks for the reply — happy to share a few concrete ideas. Do you have 15 minutes this week for a quick call?"
      : null,
  };
}

export async function analyzeReply(body: string, context: { companyName: string; leadStatus: string }): Promise<ReplyAnalysis> {
  const system = `You analyze inbound email replies to B2B outbound campaigns for a creative production company. Classify the reply and respond as strict JSON: {"category": one of ["INTERESTED","MAYBE","NOT_NOW","NOT_INTERESTED","WRONG_PERSON","OUT_OF_OFFICE","UNSUBSCRIBE","NEGATIVE","HOT_LEAD"], "isHot": boolean, "summary": string (1 sentence), "suggestedAction": string (1 sentence, what the sales rep should do next), "suggestedReply": string or null (a short, human, low-pressure draft reply — only if a reply is appropriate, e.g. INTERESTED or HOT_LEAD)}.`;
  const user = JSON.stringify({ company: context.companyName, replyBody: body });

  const result = await completeJson<{
    category: ReplyCategory;
    isHot: boolean;
    summary: string;
    suggestedAction: string;
    suggestedReply: string | null;
  }>({ system, user, temperature: 0.2 });

  if (!result) return mockAnalysis(body);

  const validCategories: ReplyCategory[] = [
    "INTERESTED",
    "MAYBE",
    "NOT_NOW",
    "NOT_INTERESTED",
    "WRONG_PERSON",
    "OUT_OF_OFFICE",
    "UNSUBSCRIBE",
    "NEGATIVE",
    "HOT_LEAD",
  ];
  const category = validCategories.includes(result.category) ? result.category : classifyByKeywords(body);

  return {
    category,
    isHot: Boolean(result.isHot) || category === "HOT_LEAD",
    summary: result.summary || mockAnalysis(body).summary,
    suggestedAction: result.suggestedAction || mockAnalysis(body).suggestedAction,
    suggestedReply: result.suggestedReply ?? null,
  };
}

export function shouldStopFollowups(category: ReplyCategory): boolean {
  return category !== "OUT_OF_OFFICE"; // any real reply other than an autoresponder stops the sequence
}
