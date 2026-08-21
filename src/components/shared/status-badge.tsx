import type { LeadStatus, CampaignStatus, EmailStatus, FollowupStatus, CampaignLeadStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

const LEAD_STATUS_CONFIG: Record<LeadStatus, { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" | "muted" | "outline" }> = {
  RESEARCH: { label: "Research", variant: "muted" },
  QUALIFIED: { label: "Qualified", variant: "outline" },
  CONTACTED: { label: "Contacted", variant: "default" },
  REPLIED: { label: "Replied", variant: "success" },
  CALL: { label: "Call", variant: "success" },
  PROPOSAL: { label: "Proposal", variant: "success" },
  NEGOTIATION: { label: "Negotiation", variant: "success" },
  WON: { label: "Won", variant: "success" },
  LOST: { label: "Lost", variant: "muted" },
  DO_NOT_CONTACT: { label: "Do Not Contact", variant: "destructive" },
  REJECTED: { label: "Rejected", variant: "muted" },
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const cfg = LEAD_STATUS_CONFIG[status];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

const CAMPAIGN_STATUS_CONFIG: Record<CampaignStatus, { label: string; variant: "default" | "secondary" | "success" | "warning" | "muted" }> = {
  DRAFT: { label: "Draft", variant: "muted" },
  PENDING_APPROVAL: { label: "Pending Approval", variant: "warning" },
  ACTIVE: { label: "Active", variant: "success" },
  PAUSED: { label: "Paused", variant: "secondary" },
  COMPLETED: { label: "Completed", variant: "default" },
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const cfg = CAMPAIGN_STATUS_CONFIG[status];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

const EMAIL_STATUS_CONFIG: Record<EmailStatus, { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" | "muted" }> = {
  DRAFT: { label: "Draft", variant: "muted" },
  APPROVED: { label: "Approved", variant: "default" },
  REJECTED: { label: "Rejected", variant: "destructive" },
  QUEUED: { label: "Queued", variant: "secondary" },
  SENDING: { label: "Sending", variant: "warning" },
  SENT: { label: "Sent", variant: "success" },
  DELIVERED: { label: "Delivered", variant: "success" },
  BOUNCED: { label: "Bounced", variant: "destructive" },
  FAILED: { label: "Failed", variant: "destructive" },
};

export function EmailStatusBadge({ status }: { status: EmailStatus }) {
  const cfg = EMAIL_STATUS_CONFIG[status];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

const FOLLOWUP_STATUS_CONFIG: Record<FollowupStatus, { label: string; variant: "default" | "secondary" | "success" | "muted" }> = {
  SCHEDULED: { label: "Scheduled", variant: "secondary" },
  SENT: { label: "Sent", variant: "success" },
  SKIPPED: { label: "Skipped", variant: "muted" },
  STOPPED: { label: "Stopped", variant: "muted" },
};

export function FollowupStatusBadge({ status }: { status: FollowupStatus }) {
  const cfg = FOLLOWUP_STATUS_CONFIG[status];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

const CAMPAIGN_LEAD_STATUS_CONFIG: Record<CampaignLeadStatus, { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" | "muted" }> = {
  SELECTED: { label: "Selected", variant: "muted" },
  GENERATING: { label: "Generating", variant: "warning" },
  READY_FOR_REVIEW: { label: "Ready for Review", variant: "secondary" },
  APPROVED: { label: "Approved", variant: "default" },
  REJECTED: { label: "Rejected", variant: "destructive" },
  QUEUED: { label: "Queued", variant: "secondary" },
  SENT: { label: "Sent", variant: "success" },
  FAILED: { label: "Failed", variant: "destructive" },
};

export function CampaignLeadStatusBadge({ status }: { status: CampaignLeadStatus }) {
  const cfg = CAMPAIGN_LEAD_STATUS_CONFIG[status];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
