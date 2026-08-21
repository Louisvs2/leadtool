"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function QueueStatusBanner({ pendingCount }: { pendingCount: number }) {
  const router = useRouter();
  const hasPending = pendingCount > 0;

  useEffect(() => {
    if (!hasPending) return;
    let cancelled = false;

    async function tick() {
      const res = await fetch("/api/research/process", { method: "POST" });
      if (!res.ok || cancelled) return;
      const data = await res.json();
      if (!cancelled) {
        router.refresh();
        if (!data.done) setTimeout(tick, 1500);
      }
    }
    tick();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPending]);

  if (!hasPending) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
      <Loader2 className="size-4 animate-spin text-muted-foreground" />
      <span>{pendingCount} leads currently researching…</span>
    </div>
  );
}
