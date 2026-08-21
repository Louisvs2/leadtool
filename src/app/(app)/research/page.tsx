import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { QueueStatusBanner } from "@/components/leads/queue-status-banner";
import { FailedResearchList } from "@/components/leads/failed-research-list";

export default async function ResearchPage() {
  const [queued, researching, scoring, ready, failed, failedLeads] = await Promise.all([
    prisma.lead.count({ where: { pipelineStatus: "QUEUED" } }),
    prisma.lead.count({ where: { pipelineStatus: "RESEARCHING" } }),
    prisma.lead.count({ where: { pipelineStatus: "SCORING" } }),
    prisma.lead.count({ where: { pipelineStatus: "READY" } }),
    prisma.lead.count({ where: { pipelineStatus: "FAILED" } }),
    prisma.lead.findMany({
      where: { pipelineStatus: "FAILED" },
      include: { company: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
  ]);

  const pending = queued + researching + scoring;

  return (
    <div className="space-y-6">
      <PageHeader title="Research" description="Live status of the research → score pipeline across all leads." />

      <QueueStatusBanner pendingCount={pending} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ["Queued", queued],
          ["Researching", researching],
          ["Scoring", scoring],
          ["Ready", ready],
          ["Failed", failed],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <CardContent className="pt-6">
              <p className="text-2xl font-semibold tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium">Failed research</h2>
        <FailedResearchList leads={failedLeads.map((l) => ({ id: l.id, companyName: l.company.name, pipelineError: l.pipelineError }))} />
      </div>
    </div>
  );
}
