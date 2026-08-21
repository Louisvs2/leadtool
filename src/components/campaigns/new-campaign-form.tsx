"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TARGET_INDUSTRIES, COUNTRIES } from "@/lib/constants";
import type { Prisma } from "@prisma/client";

type PreselectedLead = Prisma.LeadGetPayload<{ include: { company: true; contact: true } }>;

const ANGLES = [
  { value: "AUTO", label: "Auto (AI selects best angle per lead)" },
  { value: "PRODUCT_LAUNCH", label: "Product Launch" },
  { value: "BRAND", label: "Brand" },
  { value: "CONTENT", label: "Content" },
  { value: "AI", label: "AI" },
  { value: "RECRUITING", label: "Recruiting" },
  { value: "DIGITAL", label: "Digital" },
];

export function NewCampaignForm({ preselectedLeads }: { preselectedLeads: PreselectedLead[] }) {
  const router = useRouter();
  const [mode] = useState<"preselected" | "filter">(preselectedLeads.length > 0 ? "preselected" : "filter");
  const [name, setName] = useState(preselectedLeads.length > 0 ? "" : "");
  const [angle, setAngle] = useState("AUTO");
  const [pitchUrl, setPitchUrl] = useState("");
  const [minScore, setMinScore] = useState(70);
  const [leadCount, setLeadCount] = useState(50);
  const [countries, setCountries] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("Give the campaign a name");
      return;
    }
    setSubmitting(true);
    try {
      let leadIds = preselectedLeads.map((l) => l.id);

      if (mode === "filter") {
        const params = new URLSearchParams();
        if (minScore) params.set("minScore", String(minScore));
        params.set("status", "QUALIFIED");
        const res = await fetch(`/api/leads?${params.toString()}`);
        const data = await res.json();
        leadIds = data.leads
          .filter((l: { company: { industry: string | null; country: string | null } }) => {
            const industryOk = industries.length === 0 || (l.company.industry && industries.includes(l.company.industry));
            const countryOk = countries.length === 0 || (l.company.country && countries.includes(l.company.country));
            return industryOk && countryOk;
          })
          .slice(0, leadCount)
          .map((l: { id: string }) => l.id);
      }

      if (leadIds.length === 0) {
        toast.error("No leads match — widen your criteria or select leads first.");
        setSubmitting(false);
        return;
      }

      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          leadIds,
          angle,
          pitchUrl: pitchUrl || undefined,
          minScore,
          targetCountries: countries.join(","),
          targetIndustries: industries.join(","),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create campaign");

      router.push(`/campaigns/${data.campaign.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create campaign");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-5 pt-6">
        <div className="space-y-1.5">
          <Label htmlFor="name">Campaign name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Q3 Fashion & Beauty Outreach" />
        </div>

        {mode === "preselected" ? (
          <div className="space-y-2">
            <Label>Target audience</Label>
            <div className="flex flex-wrap gap-1.5 rounded-lg border p-3">
              <Badge>{preselectedLeads.length} leads selected</Badge>
              {preselectedLeads.slice(0, 6).map((l) => (
                <Badge key={l.id} variant="secondary">
                  {l.company.name}
                </Badge>
              ))}
              {preselectedLeads.length > 6 && <Badge variant="muted">+{preselectedLeads.length - 6} more</Badge>}
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Countries</Label>
              <div className="flex flex-wrap gap-1.5">
                {COUNTRIES.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => toggle(countries, setCountries, c)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${countries.includes(c) ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Industries</Label>
              <div className="flex flex-wrap gap-1.5">
                {TARGET_INDUSTRIES.map((i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => toggle(industries, setIndustries, i)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${industries.includes(i) ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="leadCount">Number of leads</Label>
                <Input id="leadCount" type="number" value={leadCount} onChange={(e) => setLeadCount(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="minScore">Minimum score</Label>
                <Input id="minScore" type="number" value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} />
              </div>
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Email angle</Label>
            <Select value={angle} onValueChange={setAngle}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANGLES.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pitchUrl">Pitch link (optional override)</Label>
            <Input id="pitchUrl" value={pitchUrl} onChange={(e) => setPitchUrl(e.target.value)} placeholder="Uses default from Settings" />
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={submitting} className="w-full">
          {submitting ? <Loader2 className="animate-spin" /> : <Sparkles />}
          Create Campaign
        </Button>
      </CardContent>
    </Card>
  );
}
