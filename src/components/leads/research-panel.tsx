import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Microscope } from "lucide-react";
import type { ResearchFact, ResearchSummary } from "@prisma/client";

const CONFIDENCE_VARIANT: Record<string, "success" | "warning" | "muted"> = {
  HIGH: "success",
  MEDIUM: "warning",
  LOW: "muted",
};

export function ResearchPanel({ summary, facts }: { summary: ResearchSummary | null; facts: ResearchFact[] }) {
  if (!summary && facts.length === 0) {
    return <EmptyState icon={Microscope} title="No research yet" description="Run research to gather grounded facts about this company." />;
  }

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">What we know</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{summary.whatWeKnow}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">What they may need</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{summary.whatTheyMayNeed}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Why CultTwenty</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{summary.whyCulttwenty}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Outreach angle</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <Badge variant="outline" className="mb-1.5">
                {summary.angle.replace(/_/g, " ")}
              </Badge>
              <p>{summary.outreachAngle}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Research facts ({facts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {facts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No facts recorded.</p>
          ) : (
            <ul className="space-y-3">
              {facts.map((fact) => (
                <li key={fact.id} className="space-y-1 border-b pb-3 text-sm last:border-0 last:pb-0">
                  <p>{fact.factText}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant={CONFIDENCE_VARIANT[fact.confidence]}>{fact.confidence}</Badge>
                    <Badge variant="muted">{fact.category.replace(/_/g, " ")}</Badge>
                    {fact.sourceUrl ? (
                      <a href={fact.sourceUrl} target="_blank" rel="noreferrer" className="hover:underline">
                        {new URL(fact.sourceUrl).hostname}
                      </a>
                    ) : (
                      <span>Manually provided</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
