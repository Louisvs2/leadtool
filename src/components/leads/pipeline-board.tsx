"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { cn, formatCurrency } from "@/lib/utils";
import { ScoreBadge } from "@/components/shared/score-badge";
import type { LeadListItem } from "@/types/api";
import type { LeadStatus } from "@prisma/client";

const COLUMNS: { status: LeadStatus; label: string }[] = [
  { status: "RESEARCH", label: "Research" },
  { status: "QUALIFIED", label: "Qualified" },
  { status: "CONTACTED", label: "Contacted" },
  { status: "REPLIED", label: "Replied" },
  { status: "CALL", label: "Call" },
  { status: "PROPOSAL", label: "Proposal" },
  { status: "NEGOTIATION", label: "Negotiation" },
  { status: "WON", label: "Won" },
  { status: "LOST", label: "Lost" },
];

export function PipelineBoard({ leads }: { leads: LeadListItem[] }) {
  const router = useRouter();
  const [dragOverStatus, setDragOverStatus] = useState<LeadStatus | null>(null);
  const [localLeads, setLocalLeads] = useState(leads);

  async function moveLead(leadId: string, status: LeadStatus) {
    setLocalLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status } : l)));
    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      toast.error("Failed to move lead");
      router.refresh();
    }
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex min-w-max gap-3">
        {COLUMNS.map((col) => {
          const items = localLeads.filter((l) => l.status === col.status);
          return (
            <div
              key={col.status}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverStatus(col.status);
              }}
              onDragLeave={() => setDragOverStatus((s) => (s === col.status ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                const leadId = e.dataTransfer.getData("text/lead-id");
                if (leadId) moveLead(leadId, col.status);
                setDragOverStatus(null);
              }}
              className={cn(
                "flex w-64 shrink-0 flex-col gap-2 rounded-lg border bg-muted/30 p-2",
                dragOverStatus === col.status && "ring-2 ring-primary",
              )}
            >
              <div className="flex items-center justify-between px-1.5 py-1">
                <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{col.label}</span>
                <span className="text-xs text-muted-foreground">{items.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {items.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/leads/${lead.id}`}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/lead-id", lead.id)}
                    className="cursor-grab space-y-1.5 rounded-md border bg-card p-2.5 text-sm shadow-sm hover:shadow-md active:cursor-grabbing"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="line-clamp-1 font-medium">{lead.company.name}</span>
                      <ScoreBadge score={lead.score} grade={lead.grade} size="sm" />
                    </div>
                    {lead.opportunityValue ? (
                      <p className="text-xs text-muted-foreground">{formatCurrency(lead.opportunityValue)}</p>
                    ) : null}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
