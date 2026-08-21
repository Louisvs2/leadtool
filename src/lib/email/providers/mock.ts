import type { EmailProvider, SendEmailInput, SendEmailResult } from "@/lib/email/types";

/**
 * Default provider. Never makes a network call — logs the send and returns
 * a synthetic message id, so the entire send → track → follow-up pipeline
 * is fully exercisable in local dev and demos without any provider configured.
 */
export const mockEmailProvider: EmailProvider = {
  name: "mock",
  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const providerMessageId = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    console.log(`[mock email provider] → ${input.to} :: ${input.subject}`);
    return {
      ok: true,
      providerMessageId,
      response: { provider: "mock", to: input.to, subject: input.subject, sentAt: new Date().toISOString() },
    };
  },
};
