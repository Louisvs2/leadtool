"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sparkles, Ban, X, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function BulkActionsBar({ selectedIds, onClear }: { selectedIds: string[]; onClear: () => void }) {
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);

  if (selectedIds.length === 0) return null;

  async function handleRejectAll() {
    setRejecting(true);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          fetch(`/api/leads/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "REJECTED" }),
          }),
        ),
      );
      toast.success(`${selectedIds.length} leads rejected`);
      onClear();
      router.refresh();
    } catch {
      toast.error("Failed to reject leads");
    } finally {
      setRejecting(false);
    }
  }

  return (
    <div className="sticky bottom-4 z-20 mx-auto flex w-fit items-center gap-3 rounded-full border bg-card px-4 py-2 shadow-lg animate-slide-up">
      <span className="text-sm font-medium">{selectedIds.length} selected</span>
      <div className="h-4 w-px bg-border" />
      <Button size="sm" asChild>
        <a href={`/campaigns/new?leadIds=${selectedIds.join(",")}`}>
          <Sparkles /> Generate Outreach
        </a>
      </Button>
      <Button size="sm" variant="outline" asChild>
        <a href={`/api/leads/export`} target="_blank" rel="noreferrer">
          <Download /> Export
        </a>
      </Button>
      <Button size="sm" variant="outline" onClick={handleRejectAll} disabled={rejecting}>
        <Ban /> Reject
      </Button>
      <Button size="icon" variant="ghost" className="size-7" onClick={onClear}>
        <X className="size-4" />
      </Button>
    </div>
  );
}
