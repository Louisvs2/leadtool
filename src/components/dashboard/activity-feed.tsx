import Link from "next/link";
import {
  UserPlus,
  Microscope,
  Mail,
  MailCheck,
  MessageSquare,
  CheckCircle2,
  XCircle,
  CalendarClock,
  Ban,
  Megaphone,
} from "lucide-react";
import { relativeTime } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import type { ActivityLog, Lead, Company, Campaign } from "@prisma/client";

type ActivityWithRelations = ActivityLog & {
  lead: (Lead & { company: Company }) | null;
  campaign: Campaign | null;
};

const ACTION_CONFIG: Record<string, { label: string; icon: typeof UserPlus }> = {
  lead_created: { label: "Lead created", icon: UserPlus },
  lead_imported: { label: "Lead imported", icon: UserPlus },
  research_started: { label: "Research started", icon: Microscope },
  research_completed: { label: "Research completed", icon: Microscope },
  research_failed: { label: "Research failed", icon: XCircle },
  email_generated: { label: "Email generated", icon: Mail },
  email_edited: { label: "Email edited", icon: Mail },
  email_approved: { label: "Email approved", icon: CheckCircle2 },
  email_rejected: { label: "Email rejected", icon: XCircle },
  email_sent: { label: "Email sent", icon: MailCheck },
  email_bounced: { label: "Email bounced", icon: XCircle },
  email_failed: { label: "Email failed", icon: XCircle },
  reply_received: { label: "Reply received", icon: MessageSquare },
  followup_scheduled: { label: "Follow-up scheduled", icon: CalendarClock },
  followup_sent: { label: "Follow-up sent", icon: MailCheck },
  followup_stopped: { label: "Follow-ups stopped", icon: Ban },
  lead_rejected: { label: "Lead rejected", icon: XCircle },
  lead_unsubscribed: { label: "Lead unsubscribed", icon: Ban },
  lead_status_changed: { label: "Status changed", icon: CheckCircle2 },
  campaign_created: { label: "Campaign created", icon: Megaphone },
  campaign_approved: { label: "Campaign approved", icon: CheckCircle2 },
  campaign_sent: { label: "Campaign sent", icon: Megaphone },
  note_added: { label: "Note added", icon: Mail },
  opportunity_updated: { label: "Opportunity updated", icon: CheckCircle2 },
  settings_updated: { label: "Settings updated", icon: CheckCircle2 },
};

export function ActivityFeed({ activity }: { activity: ActivityWithRelations[] }) {
  if (activity.length === 0) {
    return <EmptyState title="No activity yet" description="Actions across leads and campaigns will show up here." />;
  }

  return (
    <ul className="divide-y">
      {activity.map((item) => {
        const cfg = ACTION_CONFIG[item.action] ?? { label: item.action, icon: CheckCircle2 };
        const Icon = cfg.icon;
        return (
          <li key={item.id} className="flex items-start gap-3 py-3">
            <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
              <Icon className="size-3.5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                {cfg.label}
                {item.lead && (
                  <>
                    {" — "}
                    <Link href={`/leads/${item.lead.id}`} className="font-medium hover:underline">
                      {item.lead.company.name}
                    </Link>
                  </>
                )}
                {item.campaign && !item.lead && (
                  <>
                    {" — "}
                    <Link href={`/campaigns/${item.campaign.id}`} className="font-medium hover:underline">
                      {item.campaign.name}
                    </Link>
                  </>
                )}
              </p>
              <p className="text-xs text-muted-foreground">{relativeTime(item.createdAt)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
