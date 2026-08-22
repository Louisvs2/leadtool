"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmailReviewCard, type EmailReviewMessage } from "@/components/messages/email-review-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Mail } from "lucide-react";

export function GenerateEmailPanel({ leadId, drafts }: { leadId: string; drafts: EmailReviewMessage[] }) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleGenerate(confirmLowScore = false) {
    setGenerating(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/generate-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmLowScore }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.requiresConfirmation) {
          setConfirmOpen(true);
          return;
        }
        throw new Error(data.error ?? "Failed to generate email");
      }
      toast.success("Generated 3 email variants");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate email");
    } finally {
      setGenerating(false);
    }
  }

  const confirmDialog = (
    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reach out despite the low score?</AlertDialogTitle>
          <AlertDialogDescription>
            This lead scored below 60 (DO NOT CONTACT) — the scoring engine doesn&apos;t recommend contacting it. If
            you&apos;ve reviewed it yourself and want to reach out anyway, confirm below.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => (setConfirmOpen(false), handleGenerate(true))}>Generate anyway</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (drafts.length === 0) {
    return (
      <>
        {confirmDialog}
        <EmptyState
          icon={Mail}
          title="No draft emails yet"
          description="Generate three tailored variants — direct, creative and consultative — grounded in this lead's research."
          action={
            <Button onClick={() => handleGenerate()} disabled={generating}>
              {generating ? <Loader2 className="animate-spin" /> : <Sparkles />}
              Generate Email
            </Button>
          }
        />
      </>
    );
  }

  return (
    <div className="space-y-3">
      {confirmDialog}
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => handleGenerate()} disabled={generating}>
          {generating ? <Loader2 className="animate-spin" /> : <Sparkles />}
          Regenerate all variants
        </Button>
      </div>
      <Tabs defaultValue={drafts[0]?.variant ?? "A"}>
        <TabsList>
          {drafts.map((d) => (
            <TabsTrigger key={d.id} value={d.variant}>
              Variant {d.variant}
            </TabsTrigger>
          ))}
        </TabsList>
        {drafts.map((d) => (
          <TabsContent key={d.id} value={d.variant} className="pt-3">
            <EmailReviewCard message={d} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
