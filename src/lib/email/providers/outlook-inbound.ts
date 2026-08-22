import { prisma } from "@/lib/prisma";
import { getEffectiveSecrets } from "@/lib/secrets";
import { getGraphToken } from "@/lib/email/providers/outlook";
import { matchLeadForInboundEmail } from "@/lib/reply/match-lead";
import { recordReply } from "@/lib/reply/handler";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

type GraphMessage = {
  from?: { emailAddress?: { address?: string } };
  subject?: string;
  body?: { content?: string };
  internetMessageHeaders?: { name: string; value: string }[];
};

function extractHeader(headers: GraphMessage["internetMessageHeaders"], name: string): string | undefined {
  return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;
}

/**
 * Polls the configured Outlook mailbox's Inbox for messages received since
 * the last poll and, for each one that matches a known lead/contact,
 * records it as a reply — the poll-based equivalent of the generic
 * /api/inbound/email webhook other providers push to (Graph has no
 * arbitrary-URL inbound-parse webhook). Called from the dispatch loop
 * (/api/cron/process), not directly by users.
 */
export async function pollOutlookInbox() {
  const { graph } = await getEffectiveSecrets();
  if (!graph.tenantId || !graph.clientId || !graph.clientSecret || !graph.mailbox) {
    return { polled: 0, matched: 0 };
  }

  const settings = await prisma.settings.findUniqueOrThrow({ where: { id: "default" } });
  const since = settings.graphLastPolledAt ?? new Date(Date.now() - 60 * 60 * 1000);
  const now = new Date();

  // Cursor only advances on a successful poll — on any error, the next run
  // retries the same window instead of silently skipping messages that
  // arrived during a transient failure.
  try {
    const token = await getGraphToken(graph.tenantId, graph.clientId, graph.clientSecret);
    const mailbox = encodeURIComponent(graph.mailbox);
    // Strictly-greater-than avoids reprocessing a message that sits exactly
    // on the previous poll's cursor boundary.
    const filter = encodeURIComponent(`receivedDateTime gt ${since.toISOString()}`);
    const select = "from,subject,body,receivedDateTime,internetMessageHeaders";

    const res = await fetch(
      `${GRAPH_BASE}/users/${mailbox}/mailFolders/Inbox/messages?$filter=${filter}&$select=${select}&$orderby=receivedDateTime asc&$top=50`,
      { headers: { Authorization: `Bearer ${token}`, Prefer: 'outlook.body-content-type="text"' } },
    );
    if (!res.ok) {
      return { polled: 0, matched: 0, error: `Graph inbox poll failed (${res.status})` };
    }
    const data = await res.json();
    const messages: GraphMessage[] = data.value ?? [];

    let matched = 0;
    for (const message of messages) {
      const fromEmail = message.from?.emailAddress?.address;
      if (!fromEmail) continue;

      const inReplyTo =
        extractHeader(message.internetMessageHeaders, "In-Reply-To") ??
        extractHeader(message.internetMessageHeaders, "References")?.trim().split(/\s+/).pop();

      const { leadId, emailMessageId } = await matchLeadForInboundEmail({ fromEmail, inReplyToMessageId: inReplyTo });
      if (!leadId) continue;

      await recordReply({ leadId, emailMessageId, fromEmail, subject: message.subject, body: message.body?.content ?? "" });
      matched++;
    }

    await prisma.settings.update({ where: { id: "default" }, data: { graphLastPolledAt: now } });
    return { polled: messages.length, matched };
  } catch (error) {
    return { polled: 0, matched: 0, error: error instanceof Error ? error.message : "Outlook inbox poll failed" };
  }
}
