"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, cn } from "@/lib/utils";
import { OPPORTUNITY_VALUE_PRESETS } from "@/lib/constants";

export function OpportunitySelector({ leadId, value }: { leadId: string; value: number | null }) {
  const router = useRouter();
  const [custom, setCustom] = useState("");
  const [saving, setSaving] = useState(false);

  async function setValue(newValue: number | null) {
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityValue: newValue }),
      });
      if (!res.ok) throw new Error("Failed to update");
      router.refresh();
    } catch {
      toast.error("Failed to update opportunity value");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {OPPORTUNITY_VALUE_PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => setValue(preset)}
            disabled={saving}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              value === preset ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
            )}
          >
            {formatCurrency(preset)}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          placeholder="Custom amount"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          className="h-8 w-36"
        />
        <Button size="sm" variant="outline" disabled={saving || !custom} onClick={() => setValue(Number(custom))}>
          {saving ? <Loader2 className="animate-spin" /> : "Set"}
        </Button>
        {value !== null && (
          <span className="text-xs text-muted-foreground">Current: {formatCurrency(value)}</span>
        )}
      </div>
    </div>
  );
}
