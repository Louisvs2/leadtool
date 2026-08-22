"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function DeleteCampaignButton({
  campaignId,
  campaignName,
  variant = "icon",
  onDeleted,
}: {
  campaignId: string;
  campaignName: string;
  variant?: "icon" | "full";
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to delete campaign");
      toast.success(`${campaignName} deleted`);
      if (onDeleted) onDeleted();
      else router.push("/campaigns");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete campaign");
      setDeleting(false);
    }
  }

  return (
    <AlertDialog>
      {variant === "icon" ? (
        // Wrapping guard (not the Radix trigger itself): preventDefault() must live here
        // because Radix's Slot composition skips opening the dialog if the trigger's own
        // onClick calls preventDefault(). stopPropagation() alone isn't enough to stop the
        // ancestor <Link> either — Next.js Link only blocks native navigation from within
        // its own onClick, which stopPropagation prevents from ever running.
        <span className="contents" onClick={(e) => e.preventDefault()}>
          <AlertDialogTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              title="Delete campaign"
            >
              <Trash2 className="size-4" />
            </Button>
          </AlertDialogTrigger>
        </span>
      ) : (
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="text-destructive hover:text-destructive">
            <Trash2 /> Delete campaign
          </Button>
        </AlertDialogTrigger>
      )}
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &quot;{campaignName}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the campaign itself. Any emails already sent stay in each lead&apos;s history — they just
            won&apos;t be attributed to this campaign anymore. Anything still queued to send will be cancelled. This
            can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {deleting && <Loader2 className="animate-spin" />} Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
