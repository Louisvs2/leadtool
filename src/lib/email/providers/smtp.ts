import nodemailer from "nodemailer";
import { getEffectiveSecrets } from "@/lib/secrets";
import type { EmailProvider, SendEmailInput, SendEmailResult } from "@/lib/email/types";
import { textToHtml } from "@/lib/email/types";

export const smtpEmailProvider: EmailProvider = {
  name: "smtp",
  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const { smtp } = await getEffectiveSecrets();
    if (!smtp.host || !smtp.user || !smtp.password) {
      return { ok: false, error: "SMTP is not fully configured (host/user/password — Settings → API Keys)" };
    }
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: Number(smtp.port) || 587,
      secure: smtp.secure,
      auth: { user: smtp.user, pass: smtp.password },
      // Explicitly disabled: the `raw` message option can be abused for SSRF
      // / arbitrary file access (CVE-class issue patched upstream). We never
      // pass `raw`, and disable file/url attachment access defense-in-depth.
      disableFileAccess: true,
      disableUrlAccess: true,
    });

    try {
      const info = await transporter.sendMail({
        from: `${input.fromName} <${input.fromEmail}>`,
        to: input.to,
        replyTo: input.replyTo,
        subject: input.subject,
        text: input.body,
        html: textToHtml(input.body),
      });
      return { ok: true, providerMessageId: info.messageId, response: { accepted: info.accepted, rejected: info.rejected } };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "SMTP send failed" };
    }
  },
};
