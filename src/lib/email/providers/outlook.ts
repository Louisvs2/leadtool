import { getEffectiveSecrets } from "@/lib/secrets";
import type { EmailProvider, SendEmailInput, SendEmailResult } from "@/lib/email/types";
import { textToHtml } from "@/lib/email/types";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

export async function getGraphToken(tenantId: string, clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description ?? "Failed to authenticate with Microsoft Graph");
  return data.access_token as string;
}

async function graphFetch(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error?.message ?? `Graph request failed (${res.status})`);
  }
  return res.status === 202 ? null : res.json();
}

export const outlookEmailProvider: EmailProvider = {
  name: "outlook",
  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const { graph } = await getEffectiveSecrets();
    if (!graph.tenantId || !graph.clientId || !graph.clientSecret || !graph.mailbox) {
      return { ok: false, error: "Microsoft Outlook is not fully configured (Settings → API Keys)" };
    }
    try {
      const token = await getGraphToken(graph.tenantId, graph.clientId, graph.clientSecret);
      const mailbox = encodeURIComponent(graph.mailbox);

      // Create as a draft first (rather than the one-shot /sendMail action)
      // so we get the message's id/internetMessageId back immediately —
      // /sendMail returns 202 with no body, giving us nothing to match a
      // future reply against. "from" is intentionally omitted: sending via
      // /users/{mailbox}/messages already sends as that mailbox, and Graph
      // doesn't let app-only auth override the display name per-message.
      const draft = await graphFetch(`/users/${mailbox}/messages`, token, {
        method: "POST",
        body: JSON.stringify({
          subject: input.subject,
          body: { contentType: "HTML", content: textToHtml(input.body) },
          toRecipients: [{ emailAddress: { address: input.to } }],
          ...(input.replyTo ? { replyTo: [{ emailAddress: { address: input.replyTo } }] } : {}),
        }),
      });

      await graphFetch(`/users/${mailbox}/messages/${draft.id}/send`, token, { method: "POST" });

      return { ok: true, providerMessageId: draft.internetMessageId ?? draft.id, response: { id: draft.id } };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Outlook send failed" };
    }
  },
};
