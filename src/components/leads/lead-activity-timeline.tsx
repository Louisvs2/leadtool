import { EmptyState } from "@/components/shared/empty-state";
import { History } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import type { ActivityLog } from "@prisma/client";

const ACTION_LABEL: Record<string, string> = {
  lead_created: "Lead created",
  lead_imported: "Lead imported",
  research_started: "Research started",
  research_completed: "Research completed",
  research_failed: "Research failed",
  email_generated: "Email generated",
  email_edited: "Email edited",
  email_approved: "Email approved",
  email_rejected: "Email rejected",
  email_sent: "Email sent",
  email_bounced: "Email bounced",
  email_failed: "Email failed",
  reply_received: "Reply received",
  followup_scheduled: "Follow-up scheduled",
  followup_sent: "Follow-up sent",
  followup_stopped: "Follow-ups stopped",
  lead_rejected: "Lead rejected",
  lead_unsubscribed: "Unsubscribed",
  lead_status_changed: "Status changed",
  note_added: "Note added",
  opportunity_updated: "Opportunity updated",
};

export function LeadActivityTimeline({ logs }: { logs: ActivityLog[] }) {
  if (logs.length === 0) {
    return <EmptyState icon={History} title="No activity yet" />;
  }

  return (
    <ol className="relative space-y-4 border-l pl-4">
      {logs.map((log) => (
        <li key={log.id} className="relative">
          <div className="absolute top-1 -left-[21px] size-2.5 rounded-full border-2 border-background bg-muted-foreground" />
          <p className="text-sm font-medium">{ACTION_LABEL[log.action] ?? log.action}</p>
          <p className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</p>
        </li>
      ))}
    </ol>
  );
}
