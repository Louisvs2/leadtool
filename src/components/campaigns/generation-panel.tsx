"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type GenerationState = {
  remainingSelected: number;
  generating: number;
  readyForReview: number;
  failed: number;
  done: boolean;
};

export function GenerationPanel({
  campaignId,
  selectedCount,
  readyOrDoneCount,
  failedCount,
}: {
  campaignId: string;
  selectedCount: number;
  readyOrDoneCount: number;
  failedCount: number;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [state, setState] = useState<GenerationState | null>(null);

  const totalToProcess = selectedCount;

  useEffect(() => {
    if (!running) return;
    let cancelled = false;

    async function tick() {
      const res = await fetch(`/api/campaigns/${campaignId}/generate`, { method: "POST" });
      if (!res.ok || cancelled) return;
      const data: GenerationState = await res.json();
      setState(data);
      if (!data.done && !cancelled) {
        setTimeout(tick, 1000);
      } else {
        setRunning(false);
        router.refresh();
      }
    }
    tick();

    return () => {
      cancelled = true;
    };
  }, [running, campaignId, router]);

  if (selectedCount === 0 && readyOrDoneCount > 0) {
    const succeeded = readyOrDoneCount - failedCount;
    return (
      <div
        className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
          failedCount > 0 ? "border-warning/30 bg-warning/5 text-warning" : "border-success/30 bg-success/5 text-success"
        }`}
      >
        <CheckCircle2 className="size-4" />
        {failedCount > 0
          ? `Outreach generated for ${succeeded} of ${readyOrDoneCount} leads — ${failedCount} failed (see below).`
          : `Outreach generated for all ${readyOrDoneCount} leads.`}
      </div>
    );
  }

  const processed = state ? totalToProcess - state.remainingSelected - state.generating : 0;
  const percent = totalToProcess > 0 ? Math.round((processed / totalToProcess) * 100) : 0;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Generate a grounded, individually researched email for each of the {selectedCount} selected leads. This runs
        research automatically for any lead that doesn&apos;t have it yet.
      </p>
      {running ? (
        <div className="space-y-2">
          <Progress value={percent} />
          <p className="text-xs text-muted-foreground">
            {processed} / {totalToProcess} processed
            {state?.failed ? ` — ${state.failed} failed` : ""}
          </p>
        </div>
      ) : (
        <Button onClick={() => setRunning(true)}>
          <Sparkles /> Generate Outreach
        </Button>
      )}
      {running && (
        <Button variant="outline" disabled>
          <Loader2 className="animate-spin" /> Working…
        </Button>
      )}
    </div>
  );
}
