"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, ChevronDown, ChevronUp, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoreBadge } from "@/components/shared/score-badge";
import { CampaignLeadStatusBadge } from "@/components/shared/status-badge";
import { QualityCheckBadges } from "@/components/messages/quality-check-badges";
import { wordCount } from "@/lib/utils";
import type { CampaignLeadStatus, Grade } from "@prisma/client";
import type { QualityCheckResult } from "@/lib/email/quality-check";

type Draft = {
  id: string;
  variant: string;
  subject: string;
  body: string;
  qualityCheck: string | null;
};

export function CampaignLeadReviewRow({
  campaignLeadId,
  companyName,
  companyId: leadId,
  score,
  grade,
  contactEmail,
  status,
  selectedVariant,
  drafts,
}: {
  campaignLeadId: string;
  companyName: string;
  companyId: string;
  score: number | null;
  grade: Grade | null;
  contactEmail: string | null;
  status: CampaignLeadStatus;
  selectedVariant: string | null;
  drafts: Draft[];
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState<"approve" | "reject" | "variant" | null>(null);
  const [variant, setVariant] = useState(selectedVariant ?? drafts[0]?.variant ?? "A");

  const active = drafts.find((d) => d.variant === variant) ?? drafts[0];
  const qc: QualityCheckResult | null = active?.qualityCheck ? JSON.parse(active.qualityCheck) : null;
  const isPending = status === "READY_FOR_REVIEW";

  async function handleSelectVariant(v: string) {
    setVariant(v);
    setBusy("variant");
    try {
      await fetch(`/api/campaign-leads/${campaignLeadId}/select-variant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variant: v }),
      });
    } finally {
      setBusy(null);
    }
  }

  async function handleApprove() {
    setBusy("approve");
    try {
      const res = await fetch(`/api/campaign-leads/${campaignLeadId}/approve`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(`${companyName} approved`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to approve");
    } finally {
      setBusy(null);
    }
  }

  async function handleReject() {
    setBusy("reject");
    try {
      const res = await fetch(`/api/campaign-leads/${campaignLeadId}/reject`, { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success(`${companyName} rejected`);
      router.refresh();
    } catch {
      toast.error("Failed to reject");
    } finally {
      setBusy(null);
    }
  }

  if (!active) return null;

  return (
    <div className="rounded-xl border bg-card">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <ScoreBadge score={score} grade={grade} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link href={`/leads/${leadId}`} onClick={(e) => e.stopPropagation()} className="font-medium hover:underline">
              {companyName}
            </Link>
            <CampaignLeadStatusBadge status={status} />
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {contactEmail} — {active.subject}
          </p>
        </div>
        {expanded ? <ChevronUp className="size-4 shrink-0" /> : <ChevronDown className="size-4 shrink-0" />}
      </button>

      {expanded && (
        <div className="space-y-3 border-t p-4">
          {drafts.length > 1 && (
            <Tabs value={variant} onValueChange={handleSelectVariant}>
              <TabsList>
                {drafts.map((d) => (
                  <TabsTrigger key={d.id} value={d.variant} disabled={busy !== null}>
                    Variant {d.variant}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}

          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Subject: </span>
              <span className="font-medium">{active.subject}</span>
            </p>
          </div>
          <div className="rounded-lg bg-muted/40 p-4 text-sm whitespace-pre-wrap">{active.body}</div>
          <p className="text-xs text-muted-foreground">{wordCount(active.body)} words</p>

          {qc && <QualityCheckBadges qc={qc} />}

          <div className="flex items-center justify-between border-t pt-3">
            <Button size="sm" variant="ghost" asChild>
              <Link href={`/leads/${leadId}`}>
                <ExternalLink /> Open lead
              </Link>
            </Button>
            {isPending && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleReject} disabled={busy !== null}>
                  {busy === "reject" ? <Loader2 className="animate-spin" /> : <X />}
                  Reject
                </Button>
                <Button size="sm" onClick={handleApprove} disabled={busy !== null}>
                  {busy === "approve" ? <Loader2 className="animate-spin" /> : <Check />}
                  Approve
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
