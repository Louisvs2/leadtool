import Link from "next/link";
import { Users, Target, Send, Mail, MessageSquare, Calendar, TrendingUp, Wallet, Search, Plus } from "lucide-react";
import { getDashboardStats, getRecentActivity } from "@/lib/dashboard/stats";
import { KpiTile } from "@/components/dashboard/kpi-tile";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { DemoBadge } from "@/components/shared/demo-badge";

export default async function DashboardPage() {
  const [stats, activity] = await Promise.all([getDashboardStats(), getRecentActivity()]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Find. Qualify. Personalize. Approve. Send. Close.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/leads?openFinder=1">
              <Search /> Find Leads
            </Link>
          </Button>
          <Button asChild>
            <Link href="/campaigns/new">
              <Plus /> Build Outbound Campaign
            </Link>
          </Button>
        </div>
      </div>

      {stats.demoLeadCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <DemoBadge />
          <span>
            {stats.demoLeadCount} of your leads are demo data for exploring the workflow — they can never be emailed.
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <KpiTile label="Total Leads" value={formatNumber(stats.totalLeads)} icon={Users} />
        <KpiTile label="Qualified" value={formatNumber(stats.qualified)} icon={Target} />
        <KpiTile label="Ready to Contact" value={formatNumber(stats.readyToContact)} icon={Mail} />
        <KpiTile label="Sent" value={formatNumber(stats.sent)} icon={Send} />
        <KpiTile label="Replies" value={formatNumber(stats.replies)} icon={MessageSquare} />
        <KpiTile label="Meetings" value={formatNumber(stats.meetings)} icon={Calendar} />
        <KpiTile label="Opportunities" value={formatNumber(stats.opportunities)} icon={TrendingUp} />
        <KpiTile label="Estimated Pipeline" value={formatCurrency(stats.estimatedPipeline)} icon={Wallet} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>The primary workflow</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              {[
                ["1", "Find Leads", "/leads?openFinder=1"],
                ["2", "Review & Qualify", "/leads"],
                ["3", "Generate Outreach", "/campaigns/new"],
                ["4", "Approve & Send", "/campaigns"],
              ].map(([n, label, href]) => (
                <Link
                  key={label}
                  href={href}
                  className="group rounded-lg border p-3 transition-colors hover:bg-accent"
                >
                  <span className="text-xs font-medium text-muted-foreground">STEP {n}</span>
                  <p className="mt-1 font-medium group-hover:underline">{label}</p>
                </Link>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            <ActivityFeed activity={activity} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
