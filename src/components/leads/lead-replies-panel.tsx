import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { MessageSquare, Flame } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import type { Reply } from "@prisma/client";

const CATEGORY_VARIANT: Record<string, "success" | "warning" | "destructive" | "muted" | "default"> = {
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

export function LeadRepliesPanel({ replies }: { replies: Reply[] }) {
  if (replies.length === 0) {
    return <EmptyState icon={MessageSquare} title="No replies yet" description="Replies will appear here once this lead responds." />;
  }

  return (
    <ul className="space-y-3">
      {replies.map((reply) => (
        <li key={reply.id} className="space-y-2 rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {reply.isHot && (
                <Badge variant="destructive">
                  <Flame /> HOT LEAD
                </Badge>
              )}
              <Badge variant={CATEGORY_VARIANT[reply.category] ?? "muted"}>{reply.category.replace(/_/g, " ")}</Badge>
            </div>
            <span className="text-xs text-muted-foreground">{formatDateTime(reply.receivedAt)}</span>
          </div>
          <p className="text-sm whitespace-pre-wrap">{reply.body}</p>
          {reply.aiSummary && (
            <div className="rounded-md bg-muted/50 p-2.5 text-xs">
              <p className="font-medium">AI summary</p>
              <p className="text-muted-foreground">{reply.aiSummary}</p>
            </div>
          )}
          {reply.suggestedAction && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Suggested next action: </span>
              {reply.suggestedAction}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
