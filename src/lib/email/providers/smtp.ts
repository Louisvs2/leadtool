import nodemailer from "nodemailer";
import { env } from "@/lib/env";
import type { EmailProvider, SendEmailInput, SendEmailResult } from "@/lib/email/types";
import { textToHtml } from "@/lib/email/types";

export const smtpEmailProvider: EmailProvider = {
  name: "smtp",
  async send(input: SendEmailInput): Promise<SendEmailResult> {
    if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD) {
      return { ok: false, error: "SMTP is not fully configured (host/user/password)" };
    }
    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT) || 587,
      secure: env.SMTP_SECURE === "true",
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
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
