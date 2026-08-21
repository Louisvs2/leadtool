import Link from "next/link";
import { Plus, Megaphone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CampaignStatusBadge } from "@/components/shared/status-badge";
import { computeCampaignStats } from "@/lib/campaigns/stats";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function CampaignsPage() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      campaignLeads: { include: { lead: { include: { opportunities: true } } } },
      emailMessages: { include: { events: true, replies: true } },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns"
        description={`${campaigns.length} campaign${campaigns.length === 1 ? "" : "s"}`}
        action={
          <Button asChild>
            <Link href="/campaigns/new">
              <Plus /> Build Outbound Campaign
            </Link>
          </Button>
        }
      />

      {campaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns yet"
          description="Select qualified leads and build your first outbound campaign."
          action={
            <Button asChild>
              <Link href="/campaigns/new">
                <Plus /> Build Outbound Campaign
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((campaign) => {
            const stats = computeCampaignStats(campaign);
            return (
              <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{campaign.name}</CardTitle>
                      <CampaignStatusBadge status={campaign.status} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-xs text-muted-foreground">Created {formatDate(campaign.createdAt)}</p>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-lg font-semibold tabular-nums">{stats.leads}</p>
                        <p className="text-xs text-muted-foreground">Leads</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold tabular-nums">{stats.sent}</p>
                        <p className="text-xs text-muted-foreground">Sent</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold tabular-nums">{stats.replies}</p>
                        <p className="text-xs text-muted-foreground">Replies</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t pt-3 text-sm">
                      <span className="text-muted-foreground">Pipeline</span>
                      <span className="font-medium">{formatCurrency(stats.pipeline)}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
