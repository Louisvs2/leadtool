"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { CheckCircle2 } from "lucide-react";

type FailedLead = { id: string; companyName: string; pipelineError: string | null };

export function FailedResearchList({ leads }: { leads: FailedLead[] }) {
  const router = useRouter();
  const [retrying, setRetrying] = useState<string | null>(null);

  async function retry(id: string) {
    setRetrying(id);
    try {
      const res = await fetch(`/api/leads/${id}/research`, { method: "POST" });
      const data = await res.json();
      if (data.ok === false) {
        toast.error(`Still failing: ${data.error}`);
      } else {
        toast.success("Research succeeded");
      }
      router.refresh();
    } catch {
      toast.error("Retry failed");
    } finally {
      setRetrying(null);
    }
  }

  if (leads.length === 0) {
    return <EmptyState icon={CheckCircle2} title="No failed research" description="Everything is processing cleanly." />;
  }

  return (
    <div className="space-y-2">
      {leads.map((lead) => (
        <div key={lead.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
          <div className="min-w-0">
            <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">
              {lead.companyName}
            </Link>
            <p className="truncate text-xs text-destructive">{lead.pipelineError ?? "Unknown error"}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => retry(lead.id)} disabled={retrying === lead.id}>
            {retrying === lead.id ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            Retry
          </Button>
        </div>
      ))}
    </div>
  );
}
