import type { Grade } from "@prisma/client";
import { cn } from "@/lib/utils";
import { GRADE_LABEL } from "@/lib/grade";

const RING_COLOR: Record<Grade, string> = {
  A_PLUS: "border-success text-success",
  A: "border-success text-success",
  B: "border-foreground/40 text-foreground",
  C: "border-warning text-warning",
  D: "border-destructive text-destructive",
};

export function ScoreBadge({
  score,
  grade,
  size = "default",
  className,
}: {
  score: number | null | undefined;
  grade: Grade | null | undefined;
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  if (score === null || score === undefined || !grade) {
    return (
      <div className={cn("flex flex-col items-center gap-0.5", className)}>
        <div className="flex size-10 items-center justify-center rounded-full border border-dashed text-muted-foreground text-xs">
          —
        </div>
      </div>
    );
  }

  const dims = size === "sm" ? "size-8 text-xs" : size === "lg" ? "size-16 text-2xl" : "size-11 text-sm";

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className={cn("flex items-center justify-center rounded-full border-2 font-semibold tabular-nums", dims, RING_COLOR[grade])}>
        {score}
      </div>
      <span className={cn("text-[10px] font-medium tracking-wide uppercase", RING_COLOR[grade].split(" ")[1])}>
        {GRADE_LABEL[grade]}
      </span>
    </div>
  );
}
