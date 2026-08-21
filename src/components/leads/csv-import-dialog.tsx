"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ResearchProgressDialog } from "@/components/leads/research-progress-dialog";

type ImportSummary = {
  totalRows: number;
  created: number;
  skipped: number;
  invalidEmail: number;
  errors: number;
};

export function CsvImportDialog() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [showProgress, setShowProgress] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    setSummary(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/leads/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      setSummary(data);
      if (data.created > 0) {
        toast.success(`Imported ${data.created} leads`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setSummary(null);
        }}
      >
        <DialogTrigger asChild>
          <Button variant="outline">
            <Upload /> Import CSV
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import leads from CSV</DialogTitle>
            <DialogDescription>
              Columns: company, website, industry, contact_name, contact_role, email, linkedin, country, notes
            </DialogDescription>
          </DialogHeader>

          {!summary ? (
            <div
              className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-10 text-center"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) handleUpload(file);
              }}
            >
              {uploading ? (
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="size-6 text-muted-foreground" />
              )}
              <p className="text-sm text-muted-foreground">Drag a .csv file here, or</p>
              <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
                Choose file
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                }}
              />
            </div>
          ) : (
            <div className="space-y-2 rounded-lg border p-4 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="size-4 text-success" /> {summary.created} leads created
              </div>
              <p className="text-muted-foreground">{summary.totalRows} rows processed</p>
              {summary.invalidEmail > 0 && (
                <div className="flex items-center gap-2 text-destructive">
                  <XCircle className="size-4" /> {summary.invalidEmail} rows had an invalid email
                </div>
              )}
              {summary.errors > 0 && (
                <div className="flex items-center gap-2 text-destructive">
                  <XCircle className="size-4" /> {summary.errors} rows failed
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {summary && summary.created > 0 ? (
              <Button
                onClick={() => {
                  setOpen(false);
                  setShowProgress(true);
                }}
              >
                Research imported leads
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showProgress && (
        <ResearchProgressDialog
          open
          onOpenChange={(v) => {
            if (!v) {
              setShowProgress(false);
              router.refresh();
            }
          }}
        />
      )}
    </>
  );
}
