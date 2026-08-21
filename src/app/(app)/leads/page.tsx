import { Download } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { LeadFinderDialog } from "@/components/leads/lead-finder-dialog";
import { CsvImportDialog } from "@/components/leads/csv-import-dialog";
import { LeadsFilters } from "@/components/leads/leads-filters";
import { LeadsExplorer } from "@/components/leads/leads-explorer";
import { PipelineBoard } from "@/components/leads/pipeline-board";
import { findLeads } from "@/lib/leads/queries";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const leads = await findLeads({
    status: params.status,
    minScore: params.minScore,
    industry: params.industry,
    country: params.country,
    search: params.search,
  });

  const view = params.view === "pipeline" ? "pipeline" : "cards";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description={`${leads.length} lead${leads.length === 1 ? "" : "s"} matching your filters`}
        action={
          <>
            <CsvImportDialog />
            <Button variant="outline" asChild>
              {/* File download, not a page route — a real <a> preserves the browser's native download handling. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/api/leads/export">
                <Download /> Export
              </a>
            </Button>
            <LeadFinderDialog defaultOpen={params.openFinder === "1"} />
          </>
        }
      />

      <LeadsFilters />

      {view === "pipeline" ? <PipelineBoard leads={leads} /> : <LeadsExplorer leads={leads} />}
    </div>
  );
}
