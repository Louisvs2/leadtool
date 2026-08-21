"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { LeadCard } from "@/components/leads/lead-card";
import { BulkActionsBar } from "@/components/leads/bulk-actions-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { Users } from "lucide-react";
import type { LeadListItem } from "@/types/api";

export function LeadsExplorer({ leads }: { leads: LeadListItem[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(leads.map((l) => l.id)) : new Set());
  }

  if (leads.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No leads match these filters"
        description="Try widening your filters, or use Find Leads to discover new companies."
      />
    );
  }

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Checkbox checked={selected.size === leads.length} onCheckedChange={(v) => toggleAll(Boolean(v))} />
        <span>
          {selected.size > 0 ? `${selected.size} of ${leads.length} selected` : `Select all ${leads.length}`}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} selected={selected.has(lead.id)} onToggleSelect={(v) => toggle(lead.id, v)} />
        ))}
      </div>

      <BulkActionsBar selectedIds={Array.from(selected)} onClear={() => setSelected(new Set())} />
    </div>
  );
}
