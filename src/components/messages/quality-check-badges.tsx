import { CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QualityCheckResult } from "@/lib/email/quality-check";

const LABELS: Record<keyof Omit<QualityCheckResult, "warnings" | "overallPass">, string> = {
  factuality: "Factuality",
  personalization: "Personalization",
  length: "Length",
  tone: "Tone",
  cta: "CTA",
  spam: "Spam",
};

export function QualityCheckBadges({ qc }: { qc: QualityCheckResult }) {
  const keys = Object.keys(LABELS) as (keyof typeof LABELS)[];
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {keys.map((key) => {
          const field = qc[key];
          return (
            <span
              key={key}
              title={field.note}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                field.pass ? "border-success/30 bg-success/10 text-success" : "border-warning/30 bg-warning/10 text-warning",
              )}
            >
              {field.pass ? <CheckCircle2 className="size-3" /> : <AlertTriangle className="size-3" />}
              {LABELS[key]}
            </span>
          );
        })}
      </div>
      {qc.warnings.length > 0 && (
        <ul className="space-y-1 rounded-md bg-warning/5 p-2.5 text-xs text-warning">
          {qc.warnings.map((w) => (
            <li key={w} className="flex gap-1.5">
              <AlertTriangle className="mt-0.5 size-3 shrink-0" /> {w}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
