import { Progress } from "@/components/ui/progress";
import type { LeadScore } from "@prisma/client";

const ROWS: { key: keyof LeadScore; label: string; max: number }[] = [
  { key: "budgetPotential", label: "Budget Potential", max: 25 },
  { key: "creativeNeed", label: "Creative Need", max: 20 },
  { key: "brandQuality", label: "Brand Quality", max: 15 },
  { key: "marketingActivity", label: "Marketing Activity", max: 15 },
  { key: "timing", label: "Timing / Trigger", max: 15 },
  { key: "contactQuality", label: "Contact Quality", max: 10 },
];

export function ScoreBreakdown({ score }: { score: LeadScore }) {
  return (
    <div className="space-y-3">
      {ROWS.map((row) => {
        const value = score[row.key] as number;
        return (
          <div key={row.key} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-medium tabular-nums">
                {value} / {row.max}
              </span>
            </div>
            <Progress value={(value / row.max) * 100} />
          </div>
        );
      })}
    </div>
  );
}
