import sgMail from "@sendgrid/mail";
import { getEffectiveSecrets } from "@/lib/secrets";
import type { EmailProvider, SendEmailInput, SendEmailResult } from "@/lib/email/types";
import { textToHtml } from "@/lib/email/types";

export const sendgridEmailProvider: EmailProvider = {
  name: "sendgrid",
  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const { sendgridApiKey } = await getEffectiveSecrets();
    if (!sendgridApiKey) {
      return { ok: false, error: "SendGrid API key is not configured (Settings → API Keys)" };
    }
    sgMail.setApiKey(sendgridApiKey);
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
