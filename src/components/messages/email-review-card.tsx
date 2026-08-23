"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, Pencil, RefreshCw, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmailStatusBadge } from "@/components/shared/status-badge";
import { QualityCheckBadges } from "@/components/messages/quality-check-badges";
import { wordCount } from "@/lib/utils";
import type { QualityCheckResult } from "@/lib/email/quality-check";
import type { EmailStatus } from "@prisma/client";

export type EmailReviewMessage = {
  id: string;
  toEmail: string;
  subject: string;
  body: string;
  variant: string;
  type: string;
  status: EmailStatus;
  angle: string | null;
  confidence: string | null;
  sources: string | null;
  qualityCheck: string | null;
  generatedBy: string;
};

export function EmailReviewCard({
  message,
  onChanged,
  showActions = true,
}: {
  message: EmailReviewMessage;
  onChanged?: () => void;
  showActions?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(message.subject);
  const [body, setBody] = useState(message.body);
  const [busy, setBusy] = useState<"save" | "approve" | "reject" | "regenerate" | null>(null);

  const qc = useMemo<QualityCheckResult | null>(() => {
    if (!message.qualityCheck) return null;
    try {
      return JSON.parse(message.qualityCheck);
    } catch {
      return null;
    }
  }, [message.qualityCheck]);

  const sources: string[] = useMemo(() => {
    if (!message.sources) return [];
    try {
      return JSON.parse(message.sources);
    } catch {
      return [];
    }
  }, [message.sources]);

  async function handleSave() {
    setBusy("save");
    try {
      const res = await fetch(`/api/email-messages/${message.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setEditing(false);
      toast.success("Draft saved");
      router.refresh();
      onChanged?.();
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setBusy(null);
    }
  }

  async function handleRegenerate() {
    setBusy("regenerate");
    try {
      const res = await fetch(`/api/email-messages/${message.id}/regenerate`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to regenerate");
      const data = await res.json();
      setSubject(data.message.subject);
      setBody(data.message.body);
      toast.success("Regenerated");
      router.refresh();
      onChanged?.();
    } catch {
      toast.error("Failed to regenerate");
    } finally {
      setBusy(null);
    }
  }

  async function handleApprove() {
    setBusy("approve");
    try {
      const res = await fetch(`/api/email-messages/${message.id}/approve`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to approve");
      toast.success("Approved");
      router.refresh();
      onChanged?.();
    } catch {
      toast.error("Failed to approve");
    } finally {
      setBusy(null);
    }
  }

  async function handleReject() {
    setBusy("reject");
    try {
      const res = await fetch(`/api/email-messages/${message.id}/reject`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to reject");
      toast.success("Rejected");
      router.refresh();
      onChanged?.();
    } catch {
      toast.error("Failed to reject");
    } finally {
      setBusy(null);
    }
  }

  const isDraft = message.status === "DRAFT";

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Badge variant="outline">Variant {message.variant}</Badge>
          <Badge variant="muted">{message.type.replace(/_/g, " ")}</Badge>
          {message.confidence && <Badge variant="muted">Confidence: {message.confidence}</Badge>}
          <Badge variant={message.generatedBy === "openai" ? "success" : "warning"}>
            {message.generatedBy === "openai" ? "AI" : "Mock"}
          </Badge>
        </div>
        <EmailStatusBadge status={message.status} />
      </div>

      <div className="space-y-3 p-4">
        <div className="space-y-1 text-sm">
          <div className="flex gap-2">
            <span className="w-14 shrink-0 text-muted-foreground">To</span>
            <span className="font-medium">{message.toEmail}</span>
          </div>
          <div className="flex gap-2">
            <span className="w-14 shrink-0 text-muted-foreground">Subject</span>
            {editing ? (
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="h-7 flex-1" />
            ) : (
              <span className="font-medium">{subject}</span>
            )}
          </div>
        </div>

        {editing ? (
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} className="font-mono text-sm" />
        ) : (
          <div className="rounded-lg bg-muted/40 p-4 text-sm whitespace-pre-wrap">{body}</div>
        )}

        <p className="text-xs text-muted-foreground">{wordCount(body)} words</p>

        {qc && <QualityCheckBadges qc={qc} />}

        {sources.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {sources.map((s) => (
              <a key={s} href={s} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline">
                <ExternalLink className="size-3" /> {new URL(s).hostname}
              </a>
            ))}
          </div>
        )}
      </div>

      {showActions && isDraft && (
        <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
          {editing ? (
            <Button size="sm" onClick={handleSave} disabled={busy !== null}>
              {busy === "save" ? <Loader2 className="animate-spin" /> : <Check />}
              Save
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)} disabled={busy !== null}>
              <Pencil /> Edit
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleRegenerate} disabled={busy !== null}>
            {busy === "regenerate" ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            Regenerate
          </Button>
          <Button size="sm" variant="outline" onClick={handleReject} disabled={busy !== null}>
            {busy === "reject" ? <Loader2 className="animate-spin" /> : <X />}
            Reject
          </Button>
          <Button size="sm" onClick={handleApprove} disabled={busy !== null}>
            {busy === "approve" ? <Loader2 className="animate-spin" /> : <Check />}
            Approve
          </Button>
        </div>
      )}
    </div>
  );
}
