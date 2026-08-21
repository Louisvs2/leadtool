"use client";

import Link from "next/link";
import { MoreHorizontal, Mail, Ban, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScoreBadge } from "@/components/shared/score-badge";
import { LeadStatusBadge } from "@/components/shared/status-badge";
import { DemoBadge } from "@/components/shared/demo-badge";
import { cn } from "@/lib/utils";
import type { LeadListItem } from "@/types/api";

export function LeadCard({
  lead,
  selected,
  onToggleSelect,
}: {
  lead: LeadListItem;
  selected: boolean;
  onToggleSelect: (checked: boolean) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"reject" | "research" | null>(null);

  const isProcessing = lead.pipelineStatus === "QUEUED" || lead.pipelineStatus === "RESEARCHING" || lead.pipelineStatus === "SCORING";

  async function handleReject() {
    setPending("reject");
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED" }),
      });
      if (!res.ok) throw new Error("Failed to reject lead");
      toast.success(`${lead.company.name} rejected`);
      router.refresh();
    } catch {
      toast.error("Failed to reject lead");
    } finally {
      setPending(null);
    }
  }

  async function handleRetryResearch() {
    setPending("research");
    try {
      const res = await fetch(`/api/leads/${lead.id}/research`, { method: "POST" });
      if (!res.ok) throw new Error("Research failed");
      toast.success("Research complete");
      router.refresh();
    } catch {
      toast.error("Research failed");
    } finally {
      setPending(null);
    }
  }

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-3 rounded-xl border bg-card p-4 transition-shadow hover:shadow-md",
        selected && "ring-2 ring-primary",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <Checkbox checked={selected} onCheckedChange={(v) => onToggleSelect(Boolean(v))} className="mt-1" />
          <div className="min-w-0">
            <Link href={`/leads/${lead.id}`} className="line-clamp-1 font-medium hover:underline">
              {lead.company.name}
            </Link>
            <p className="text-xs text-muted-foreground">
              {[lead.company.industry, lead.company.country].filter(Boolean).join(" / ") || "Industry unknown"}
            </p>
          </div>
        </div>
        <ScoreBadge score={lead.score} grade={lead.grade} size="sm" />
      </div>

      {lead.isDemo && <DemoBadge className="w-fit" />}

      {lead.pipelineStatus === "FAILED" ? (
        <div className="rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
          Research failed: {lead.pipelineError ?? "Unknown error"}
        </div>
      ) : isProcessing ? (
        <div className="flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" /> {lead.pipelineStatus.toLowerCase()}…
        </div>
      ) : lead.triggerText ? (
        <div className="space-y-0.5">
          <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Why now</p>
          <p className="line-clamp-2 text-sm">Signs of {lead.triggerText}.</p>
        </div>
      ) : (
        <p className="line-clamp-2 text-sm text-muted-foreground">No specific trigger identified yet.</p>
      )}

      <div className="mt-auto space-y-1 border-t pt-3">
        {lead.contact?.name ? (
          <>
            <p className="text-sm font-medium">{lead.contact.name}</p>
            <p className="text-xs text-muted-foreground">
              {lead.contact.role}
              {lead.contact.role && lead.contact.email ? " · " : ""}
              {lead.contact.email}
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">NO CONTACT FOUND</p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <LeadStatusBadge status={lead.status} />
        <div className="flex items-center gap-1">
          <Button asChild size="sm" variant="outline">
            <Link href={`/leads/${lead.id}`}>
              <ExternalLink /> View
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" disabled={pending !== null}>
                {pending ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/leads/${lead.id}?generate=1`}>
                  <Mail /> Generate Email
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleRetryResearch}>
                <RefreshCw /> Re-run research
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={handleReject}>
                <Ban /> Reject
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
