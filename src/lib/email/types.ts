export type SendEmailInput = {
  to: string;
  subject: string;
  body: string; // plain text; providers wrap into HTML as needed
  fromName: string;
  fromEmail: string;
  replyTo?: string;
};

export type SendEmailResult =
  | { ok: true; providerMessageId: string; response: unknown }
  | { ok: false; error: string; response?: unknown };

export interface EmailProvider {
  readonly name: string;
  send(input: SendEmailInput): Promise<SendEmailResult>;
}

export function textToHtml(body: string): string {
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; line-height: 1.6; color: #111;">${escaped
    .split("\n\n")
    .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
    .join("")}</div>`;
}
