import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CampaignStatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { computeCampaignStats } from "@/lib/campaigns/stats";
import { formatCurrency, formatDate } from "@/lib/utils";
import { GenerationPanel } from "@/components/campaigns/generation-panel";
import { CampaignReviewList } from "@/components/campaigns/campaign-review-list";
import { SendPanel } from "@/components/campaigns/send-panel";
import { DeleteCampaignButton } from "@/components/campaigns/delete-campaign-button";

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      campaignLeads: {
        include: { lead: { include: { company: true, contact: true, leadScore: true, opportunities: true } } },
        orderBy: { createdAt: "asc" },
      },
      emailMessages: { include: { events: true, replies: true } },
    },
  });

  if (!campaign) notFound();

  const stats = computeCampaignStats(campaign);

  const selectedCount = campaign.campaignLeads.filter((cl) => cl.status === "SELECTED" || cl.status === "GENERATING").length;
  const readyOrDoneCount = campaign.campaignLeads.filter((cl) => cl.status !== "SELECTED" && cl.status !== "GENERATING").length;
  const approvedCount = campaign.campaignLeads.filter((cl) => cl.status === "APPROVED").length;
  const queuedOrSentCount = campaign.campaignLeads.filter((cl) => cl.status === "QUEUED" || cl.status === "SENT").length;

  const reviewRows = campaign.campaignLeads
    .filter((cl) => ["READY_FOR_REVIEW", "APPROVED", "REJECTED"].includes(cl.status))
    .map((cl) => ({
      campaignLeadId: cl.id,
      companyName: cl.lead.company.name,
      companyId: cl.lead.id,
      score: cl.lead.score,
      grade: cl.lead.grade,
      contactEmail: cl.lead.contact?.email ?? null,
      status: cl.status,
      selectedVariant: cl.selectedVariant,
      drafts: campaign.emailMessages
        .filter((m) => m.leadId === cl.lead.id && m.type === "INITIAL" && (m.status === "DRAFT" || m.status === "APPROVED"))
        .map((m) => ({ id: m.id, variant: m.variant, subject: m.subject, body: m.body, qualityCheck: m.qualityCheck })),
    }));

  return (
    <div className="space-y-6">
      <Link href="/campaigns" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to campaigns
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{campaign.name}</h1>
            <CampaignStatusBadge status={campaign.status} />
          </div>
          <p className="text-sm text-muted-foreground">Created {formatDate(campaign.createdAt)}</p>
        </div>
        <DeleteCampaignButton campaignId={campaign.id} campaignName={campaign.name} variant="full" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {[
          ["Leads", stats.leads],
          ["Sent", stats.sent],
          ["Delivered", stats.delivered],
          ["Opened", stats.opened],
          ["Replies", stats.replies],
          ["Positive", stats.positiveReplies],
          ["Meetings", stats.meetings],
          ["Pipeline", formatCurrency(stats.pipeline)],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <CardContent className="pt-6">
              <p className="text-lg font-semibold tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Step 02–03 · Research &amp; Personalize</h2>
        <GenerationPanel campaignId={campaign.id} selectedCount={selectedCount} readyOrDoneCount={readyOrDoneCount} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Step 04 · Review &amp; Approve</h2>
        <CampaignReviewList campaignId={campaign.id} rows={reviewRows} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Step 05 · Send</h2>
        <SendPanel
          campaignId={campaign.id}
          status={campaign.status}
          approvedCount={approvedCount}
          queuedOrSentCount={queuedOrSentCount}
          initialSchedule={{
            sendWindowStart: campaign.sendWindowStart,
            sendWindowEnd: campaign.sendWindowEnd,
            sendDaysOfWeek: campaign.sendDaysOfWeek,
            maxSendsPerDay: campaign.maxSendsPerDay,
            minDelaySeconds: campaign.minDelaySeconds,
            maxDelaySeconds: campaign.maxDelaySeconds,
            followup1Days: campaign.followup1Days,
            followup2Days: campaign.followup2Days,
            followup3Days: campaign.followup3Days,
            followupsEnabled: campaign.followupsEnabled,
          }}
          initialCompliance={campaign.complianceConfirmed}
        />
      </section>
    </div>
  );
}
