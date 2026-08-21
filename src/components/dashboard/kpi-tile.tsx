import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function KpiTile({
  label,
  value,
  icon: Icon,
  hint,
  className,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border bg-card p-5 transition-shadow hover:shadow-sm", className)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
        {Icon && <Icon className="size-4 text-muted-foreground" strokeWidth={1.75} />}
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
