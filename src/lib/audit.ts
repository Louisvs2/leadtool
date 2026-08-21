import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "lead_created"
  | "lead_imported"
  | "research_started"
  | "research_completed"
  | "research_failed"
  | "email_generated"
  | "email_edited"
  | "email_approved"
  | "email_rejected"
  | "email_sent"
  | "email_bounced"
  | "email_failed"
  | "reply_received"
  | "followup_scheduled"
  | "followup_sent"
  | "followup_stopped"
  | "lead_rejected"
  | "lead_unsubscribed"
  | "lead_status_changed"
  | "campaign_created"
  | "campaign_approved"
  | "campaign_sent"
  | "note_added"
  | "opportunity_updated"
  | "settings_updated";

export async function logActivity(params: {
  action: AuditAction;
  leadId?: string;
  campaignId?: string;
  userId?: string;
  meta?: Record<string, unknown>;
}) {
  await prisma.activityLog.create({
    data: {
      action: params.action,
      leadId: params.leadId,
      campaignId: params.campaignId,
      userId: params.userId,
      meta: params.meta ? JSON.stringify(params.meta) : undefined,
    },
  });
}
