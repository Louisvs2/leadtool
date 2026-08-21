import type { Grade } from "@prisma/client";

export function scoreToGrade(score: number): Grade {
  if (score >= 90) return "A_PLUS";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  return "D";
}

export const GRADE_LABEL: Record<Grade, string> = {
  A_PLUS: "A+",
  A: "A",
  B: "B",
  C: "C",
  D: "DO NOT CONTACT",
};

export const GRADE_BADGE_VARIANT: Record<Grade, "success" | "default" | "secondary" | "warning" | "destructive"> = {
  A_PLUS: "success",
  A: "success",
  B: "default",
  C: "warning",
  D: "destructive",
};

export function isDoNotContact(score: number) {
  return score < 60;
}
