import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";
import { analyzeReply, shouldStopFollowups } from "@/lib/reply/analyzer";
import { stopFollowupsForLead } from "@/lib/followups/scheduler";
import { addToSuppressionList } from "@/lib/sending/guard";

const ADVANCED_STATUSES = new Set(["CALL", "PROPOSAL", "NEGOTIATION", "WON", "LOST", "DO_NOT_CONTACT", "REJECTED"]);

export async function recordReply(params: {
  leadId: string;
  emailMessageId?: string;
  fromEmail: string;
  subject?: string;
  body: string;
}) {
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: params.leadId }, include: { company: true } });

  const analysis = await analyzeReply(params.body, { companyName: lead.company.name, leadStatus: lead.status });

  const reply = await prisma.reply.create({
    data: {
      leadId: params.leadId,
      emailMessageId: params.emailMessageId,
      fromEmail: params.fromEmail,
      subject: params.subject,
      body: params.body,
      category: analysis.category,
      isHot: analysis.isHot,
      aiSummary: analysis.summary,
      suggestedAction: analysis.suggestedAction,
      suggestedReply: analysis.suggestedReply,
    },
  });

  await logActivity({ action: "reply_received", leadId: params.leadId, meta: { category: analysis.category, isHot: analysis.isHot } });

  if (!ADVANCED_STATUSES.has(lead.status)) {
    await prisma.lead.update({ where: { id: params.leadId }, data: { status: "REPLIED" } });
  }

  if (analysis.category === "UNSUBSCRIBE") {
    await addToSuppressionList(params.fromEmail, "unsubscribe", "Requested via reply");
    await prisma.lead.update({ where: { id: params.leadId }, data: { status: "DO_NOT_CONTACT", doNotContact: true } });
    await logActivity({ action: "lead_unsubscribed", leadId: params.leadId });
  }
  if (analysis.category === "NEGATIVE") {
    await addToSuppressionList(params.fromEmail, "complaint", "Negative reply");
  }

  if (shouldStopFollowups(analysis.category)) {
    await stopFollowupsForLead(params.leadId, `Lead replied (${analysis.category}).`);
  }

  return reply;
}
