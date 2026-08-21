"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Ban, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { LeadStatus } from "@prisma/client";

const STATUS_OPTIONS: LeadStatus[] = [
  "RESEARCH",
  "QUALIFIED",
  "CONTACTED",
  "REPLIED",
  "CALL",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
];

export function LeadHeaderActions({ leadId, status }: { leadId: string; status: LeadStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"status" | "reject" | "research" | null>(null);

  async function updateStatus(newStatus: string) {
    setBusy("status");
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setBusy(null);
    }
  }

  async function handleReject() {
    setBusy("reject");
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Lead rejected");
      router.refresh();
    } catch {
      toast.error("Failed to reject lead");
    } finally {
      setBusy(null);
    }
  }

  async function handleRetryResearch() {
    setBusy("research");
    try {
      const res = await fetch(`/api/leads/${leadId}/research`, { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success("Research complete");
      router.refresh();
    } catch {
      toast.error("Research failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={status} onValueChange={updateStatus} disabled={busy !== null}>
        <SelectTrigger size="sm" className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((s) => (
            <SelectItem key={s} value={s}>
              {s.replace(/_/g, " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" variant="outline" onClick={handleRetryResearch} disabled={busy !== null}>
        {busy === "research" ? <Loader2 className="animate-spin" /> : <RefreshCw />}
        Re-run research
      </Button>
      <Button size="sm" variant="outline" onClick={handleReject} disabled={busy !== null}>
        {busy === "reject" ? <Loader2 className="animate-spin" /> : <Ban />}
        Reject
      </Button>
    </div>
  );
}
