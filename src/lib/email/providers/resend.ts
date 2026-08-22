import { Resend } from "resend";
import { getEffectiveSecrets } from "@/lib/secrets";
import type { EmailProvider, SendEmailInput, SendEmailResult } from "@/lib/email/types";
import { textToHtml } from "@/lib/email/types";

export const resendEmailProvider: EmailProvider = {
  name: "resend",
  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const { resendApiKey } = await getEffectiveSecrets();
    if (!resendApiKey) {
      return { ok: false, error: "Resend API key is not configured (Settings → API Keys)" };
    }
    const resend = new Resend(resendApiKey);
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
