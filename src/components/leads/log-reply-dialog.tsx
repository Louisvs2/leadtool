"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function LogReplyDialog({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to log reply");
      toast.success(`Reply logged — categorized as ${data.reply.category.replace(/_/g, " ")}`);
      setOpen(false);
      setSubject("");
      setBody("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to log reply");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <MessageSquarePlus /> Log reply
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log a reply</DialogTitle>
          <DialogDescription>
            For a provider without inbound-parse wired up yet — paste the reply and it&apos;ll be analyzed automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="reply-subject">Subject (optional)</Label>
            <Input id="reply-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reply-body">Reply text</Label>
            <Textarea id="reply-body" value={body} onChange={(e) => setBody(e.target.value)} rows={6} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !body.trim()}>
            {submitting && <Loader2 className="animate-spin" />}
            Analyze &amp; save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
