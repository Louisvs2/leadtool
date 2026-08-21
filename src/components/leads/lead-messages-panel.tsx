import { EmptyState } from "@/components/shared/empty-state";
import { EmailReviewCard, type EmailReviewMessage } from "@/components/messages/email-review-card";
import { Mail } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

type MessageWithMeta = EmailReviewMessage & { sentAt: Date | string | null; createdAt: Date | string };

export function LeadMessagesPanel({ messages }: { messages: MessageWithMeta[] }) {
  if (messages.length === 0) {
    return <EmptyState icon={Mail} title="No messages yet" description="Generated and sent emails for this lead will show up here." />;
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <div key={message.id} className="space-y-1">
          <p className="text-xs text-muted-foreground">
            {message.sentAt ? `Sent ${formatDateTime(message.sentAt)}` : `Created ${formatDateTime(message.createdAt)}`}
          </p>
          <EmailReviewCard message={message} showActions={message.status === "DRAFT"} />
        </div>
      ))}
    </div>
  );
}
