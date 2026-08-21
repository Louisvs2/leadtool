"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { StickyNote } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import type { Note } from "@prisma/client";

export function NotesPanel({ leadId, notes }: { leadId: string; notes: Note[] }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd() {
    if (!value.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: value }),
      });
      if (!res.ok) throw new Error("Failed to add note");
      setValue("");
      router.refresh();
    } catch {
      toast.error("Failed to add note");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea placeholder="Add a note…" value={value} onChange={(e) => setValue(e.target.value)} rows={3} />
        <div className="flex justify-end">
          <Button size="sm" onClick={handleAdd} disabled={submitting || !value.trim()}>
            {submitting ? <Loader2 className="animate-spin" /> : <Plus />}
            Add note
          </Button>
        </div>
      </div>

      {notes.length === 0 ? (
        <EmptyState icon={StickyNote} title="No notes yet" />
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-lg border p-3 text-sm">
              <p className="whitespace-pre-wrap">{note.body}</p>
              <p className="mt-1.5 text-xs text-muted-foreground">{formatDateTime(note.createdAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
