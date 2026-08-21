import { Resend } from "resend";
import { env } from "@/lib/env";
import type { EmailProvider, SendEmailInput, SendEmailResult } from "@/lib/email/types";
import { textToHtml } from "@/lib/email/types";

export const resendEmailProvider: EmailProvider = {
  name: "resend",
  async send(input: SendEmailInput): Promise<SendEmailResult> {
    if (!env.RESEND_API_KEY) {
      return { ok: false, error: "RESEND_API_KEY is not configured" };
    }
    const resend = new Resend(env.RESEND_API_KEY);
    try {
      const { data, error } = await resend.emails.send({
        from: `${input.fromName} <${input.fromEmail}>`,
        to: input.to,
        replyTo: input.replyTo,
        subject: input.subject,
        text: input.body,
        html: textToHtml(input.body),
      });
      if (error) {
        return { ok: false, error: error.message, response: error };
      }
      return { ok: true, providerMessageId: data?.id ?? "unknown", response: data };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Resend send failed" };
    }
  },
};
