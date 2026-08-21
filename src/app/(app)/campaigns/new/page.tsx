import { NewCampaignForm } from "@/components/campaigns/new-campaign-form";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ leadIds?: string }>;
}) {
  const { leadIds } = await searchParams;
  const ids = leadIds ? leadIds.split(",").filter(Boolean) : [];

  const preselectedLeads = ids.length
    ? await prisma.lead.findMany({
        where: { id: { in: ids } },
        include: { company: true, contact: true },
      })
    : [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Build Outbound Campaign" description="STEP 01 — Who are we talking to?" />
      <NewCampaignForm preselectedLeads={preselectedLeads} />
    </div>
  );
}
