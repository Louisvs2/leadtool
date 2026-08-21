"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TARGET_INDUSTRIES, COUNTRIES, DEFAULT_RESEARCH_KEYWORDS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ResearchProgressDialog } from "@/components/leads/research-progress-dialog";

function MultiToggleGroup({
  options,
  selected,
  onToggle,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <button
            type="button"
            key={option}
            onClick={() => onToggle(option)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export function LeadFinderDialog({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [submitting, setSubmitting] = useState(false);
  const [progressLeadCount, setProgressLeadCount] = useState<number | null>(null);

  const [countries, setCountries] = useState<string[]>(["Germany"]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [sizeMin, setSizeMin] = useState(50);
  const [sizeMax, setSizeMax] = useState(5000);
  const [leadCount, setLeadCount] = useState(20);
  const [minQuality, setMinQuality] = useState(70);
  const [keywords, setKeywords] = useState<string[]>([...DEFAULT_RESEARCH_KEYWORDS]);

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/leads/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countries, industries, companySizeMin: sizeMin, companySizeMax: sizeMax, leadCount, minQuality, keywords }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to find leads");
      const data = await res.json();
      setOpen(false);
      setProgressLeadCount(data.count);
      toast.success(`Found ${data.count} companies — researching now…`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to find leads");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <Search /> Find Leads
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Find Leads</DialogTitle>
            <DialogDescription>
              Define the criteria for companies worth CultTwenty&apos;s attention — not the most leads, the right ones.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Country</Label>
              <MultiToggleGroup options={COUNTRIES} selected={countries} onToggle={(v) => toggle(countries, setCountries, v)} />
            </div>

            <div className="space-y-2">
              <Label>Industries</Label>
              <MultiToggleGroup options={TARGET_INDUSTRIES} selected={industries} onToggle={(v) => toggle(industries, setIndustries, v)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sizeMin">Company size (min)</Label>
                <Input id="sizeMin" type="number" value={sizeMin} onChange={(e) => setSizeMin(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sizeMax">Company size (max)</Label>
                <Input id="sizeMax" type="number" value={sizeMax} onChange={(e) => setSizeMax(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leadCount">Lead count</Label>
                <Input id="leadCount" type="number" value={leadCount} onChange={(e) => setLeadCount(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minQuality">Minimum quality</Label>
                <Input id="minQuality" type="number" value={minQuality} onChange={(e) => setMinQuality(Number(e.target.value))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Keywords</Label>
              <div className="flex flex-wrap gap-1.5">
                {keywords.map((k) => (
                  <Badge key={k} variant="secondary" className="cursor-pointer" onClick={() => setKeywords(keywords.filter((kw) => kw !== k))}>
                    {k} ×
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              Find Leads
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {progressLeadCount !== null && (
        <ResearchProgressDialog
          open
          onOpenChange={(v) => {
            if (!v) {
              setProgressLeadCount(null);
              router.refresh();
            }
          }}
        />
      )}
    </>
  );
}
