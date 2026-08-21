"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { Inbox } from "lucide-react";
import { CampaignLeadReviewRow } from "@/components/campaigns/campaign-lead-review-row";
import type { CampaignLeadStatus, Grade } from "@prisma/client";

type Row = {
  campaignLeadId: string;
  companyName: string;
  companyId: string;
  score: number | null;
  grade: Grade | null;
  contactEmail: string | null;
  status: CampaignLeadStatus;
  selectedVariant: string | null;
  drafts: { id: string; variant: string; subject: string; body: string; qualityCheck: string | null }[];
};

export function CampaignReviewList({ campaignId, rows }: { campaignId: string; rows: Row[] }) {
  const router = useRouter();
  const [approvingAll, setApprovingAll] = useState(false);

  const pending = rows.filter((r) => r.status === "READY_FOR_REVIEW");

  async function handleApproveAll() {
    setApprovingAll(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/approve-all`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to approve all");
      toast.success(`Approved ${data.approved} messages`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to approve all");
    } finally {
      setApprovingAll(false);
    }
  }

  if (rows.length === 0) {
    return <EmptyState icon={Inbox} title="Nothing to review yet" description="Generate outreach first — messages ready for review will appear here." />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {pending.length} message{pending.length === 1 ? "" : "s"} ready for review
        </p>
        {pending.length > 0 && (
          <Button size="sm" onClick={handleApproveAll} disabled={approvingAll}>
            {approvingAll ? <Loader2 className="animate-spin" /> : <CheckCheck />}
            Approve All
          </Button>
        )}
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <CampaignLeadReviewRow key={row.campaignLeadId} {...row} />
        ))}
      </div>
    </div>
  );
}
