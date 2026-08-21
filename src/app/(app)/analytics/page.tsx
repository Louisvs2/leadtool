import { PageHeader } from "@/components/shared/page-header";
import { KpiTile } from "@/components/dashboard/kpi-tile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAnalyticsOverview, getFunnelCounts } from "@/lib/analytics/stats";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Send, MailCheck, MailX, MessageSquare, ThumbsUp, Calendar, Target, Trophy, Wallet, TrendingUp } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  RESEARCH: "Research",
  QUALIFIED: "Qualified",
  CONTACTED: "Contacted",
  REPLIED: "Replied",
  CALL: "Call",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  WON: "Won",
};

export default async function AnalyticsPage() {
  const [overview, funnel] = await Promise.all([getAnalyticsOverview(), getFunnelCounts()]);
  const maxFunnel = Math.max(1, ...funnel.map((f) => f.count));

  return (
    <div className="space-y-8">
      <PageHeader title="Analytics" description="Outbound performance across every campaign." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <KpiTile label="Sent" value={formatNumber(overview.sent)} icon={Send} />
        <KpiTile label="Delivered" value={formatNumber(overview.delivered)} icon={MailCheck} />
        <KpiTile label="Bounced" value={formatNumber(overview.bounced)} icon={MailX} />
        <KpiTile label="Replies" value={formatNumber(overview.replies)} icon={MessageSquare} />
        <KpiTile label="Positive Replies" value={formatNumber(overview.positiveReplies)} icon={ThumbsUp} />
        <KpiTile label="Meetings" value={formatNumber(overview.meetings)} icon={Calendar} />
        <KpiTile label="Opportunities" value={formatNumber(overview.opportunitiesOpen)} icon={Target} />
        <KpiTile label="Won" value={formatNumber(overview.opportunitiesWon)} icon={Trophy} />
        <KpiTile label="Revenue" value={formatCurrency(overview.revenue)} icon={Wallet} />
        <KpiTile label="Pipeline Value" value={formatCurrency(overview.pipelineValue)} icon={Wallet} />
        <KpiTile label="Conversion Rate" value={`${overview.conversionRate.toFixed(1)}%`} icon={TrendingUp} hint="Won ÷ Sent" />
        <KpiTile label="Cost per Opportunity" value="—" hint="Add cost tracking to calculate" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Pipeline funnel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {funnel.map((f) => (
            <div key={f.status} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{STATUS_LABEL[f.status]}</span>
                <span className="font-medium tabular-nums">{f.count}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(f.count / maxFunnel) * 100}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
