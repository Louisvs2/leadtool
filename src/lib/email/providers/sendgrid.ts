import sgMail from "@sendgrid/mail";
import { env } from "@/lib/env";
import type { EmailProvider, SendEmailInput, SendEmailResult } from "@/lib/email/types";
import { textToHtml } from "@/lib/email/types";

export const sendgridEmailProvider: EmailProvider = {
  name: "sendgrid",
  async send(input: SendEmailInput): Promise<SendEmailResult> {
    if (!env.SENDGRID_API_KEY) {
      return { ok: false, error: "SENDGRID_API_KEY is not configured" };
    }
    sgMail.setApiKey(env.SENDGRID_API_KEY);
    try {
      const [response] = await sgMail.send({
        to: input.to,
        from: { email: input.fromEmail, name: input.fromName },
        replyTo: input.replyTo,
        subject: input.subject,
        text: input.body,
        html: textToHtml(input.body),
      });
      const messageId = response.headers["x-message-id"] as string | undefined;
      return { ok: true, providerMessageId: messageId ?? "unknown", response: { statusCode: response.statusCode } };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "SendGrid send failed" };
    }
  },
};
