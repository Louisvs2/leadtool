import Link from "next/link";
import { Flame, MessageSquare } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/shared/score-badge";
import { formatDateTime } from "@/lib/utils";

const CATEGORY_VARIANT: Record<string, "success" | "warning" | "destructive" | "muted"> = {
  INTERESTED: "success",
  HOT_LEAD: "success",
  MAYBE: "warning",
  NOT_NOW: "muted",
  NOT_INTERESTED: "destructive",
  WRONG_PERSON: "muted",
  OUT_OF_OFFICE: "muted",
  UNSUBSCRIBE: "destructive",
  NEGATIVE: "destructive",
  UNCATEGORIZED: "muted",
};

export default async function RepliesPage() {
  const replies = await prisma.reply.findMany({
    orderBy: [{ isHot: "desc" }, { receivedAt: "desc" }],
    include: { lead: { include: { company: true } } },
  });

  const hotCount = replies.filter((r) => r.isHot).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Replies" description={`${replies.length} replies${hotCount > 0 ? ` · ${hotCount} hot leads` : ""}`} />

      {replies.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No replies yet" description="Replies from your campaigns will land here, analyzed automatically." />
      ) : (
        <div className="space-y-3">
          {replies.map((reply) => (
            <Link
              key={reply.id}
              href={`/leads/${reply.leadId}`}
              className="block space-y-2 rounded-xl border bg-card p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ScoreBadge score={reply.lead.score} grade={reply.lead.grade} size="sm" />
                  <span className="font-medium">{reply.lead.company.name}</span>
                  {reply.isHot && (
                    <Badge variant="destructive">
                      <Flame /> HOT LEAD
                    </Badge>
                  )}
                  <Badge variant={CATEGORY_VARIANT[reply.category] ?? "muted"}>{reply.category.replace(/_/g, " ")}</Badge>
                </div>
                <span className="text-xs text-muted-foreground">{formatDateTime(reply.receivedAt)}</span>
              </div>
              <p className="line-clamp-2 text-sm text-muted-foreground">{reply.body}</p>
              {reply.suggestedAction && (
                <p className="text-xs">
                  <span className="font-medium">Suggested next action: </span>
                  <span className="text-muted-foreground">{reply.suggestedAction}</span>
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
