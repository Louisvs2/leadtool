"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type QueueState = {
  remainingQueued: number;
  researching: number;
  ready: number;
  failedTotal: number;
  done: boolean;
};

export function ResearchProgressDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [state, setState] = useState<QueueState | null>(null);
  const [initialPending, setInitialPending] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function tick() {
      const res = await fetch("/api/research/process", { method: "POST" });
      if (!res.ok || cancelled) return;
      const data: QueueState = await res.json();
      setState(data);
      setInitialPending((prev) => prev ?? data.remainingQueued + data.researching);
      if (!data.done && !cancelled) {
        setTimeout(tick, 1200);
      }
    }
    tick();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const pending = (state?.remainingQueued ?? 0) + (state?.researching ?? 0);
  const total = initialPending ?? pending;
  const done = total > 0 ? total - pending : 0;
  const percent = total > 0 ? Math.round((done / total) * 100) : state?.done ? 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={state?.done ?? false}>
        <DialogHeader>
          <DialogTitle>{state?.done ? "Research complete" : "Researching leads…"}</DialogTitle>
          <DialogDescription>
            Fetching public company info, detecting triggers, scoring quality. This runs entirely in the background.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Progress value={percent} />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {done} / {total} processed
            </span>
            {state?.failedTotal ? <span className="text-destructive">{state.failedTotal} failed</span> : null}
          </div>
        </div>

        <DialogFooter>
          {state?.done ? (
            <Button onClick={() => onOpenChange(false)}>
              <CheckCircle2 /> View results
            </Button>
          ) : (
            <Button variant="outline" disabled>
              <Loader2 className="animate-spin" /> Working…
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
