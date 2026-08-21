"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { LayoutGrid, Kanban } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TARGET_INDUSTRIES, COUNTRIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  "RESEARCH",
  "QUALIFIED",
  "CONTACTED",
  "REPLIED",
  "CALL",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
  "DO_NOT_CONTACT",
  "REJECTED",
];

export function LeadsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const view = searchParams.get("view") ?? "cards";

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Search company…"
        defaultValue={searchParams.get("search") ?? ""}
        onChange={(e) => setParam("search", e.target.value || null)}
        className="w-48"
      />

      <Select value={searchParams.get("status") ?? "all"} onValueChange={(v) => setParam("status", v === "all" ? null : v)}>
        <SelectTrigger size="sm" className="w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {STATUS_OPTIONS.map((s) => (
            <SelectItem key={s} value={s}>
              {s.replace(/_/g, " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("industry") ?? "all"} onValueChange={(v) => setParam("industry", v === "all" ? null : v)}>
        <SelectTrigger size="sm" className="w-36">
          <SelectValue placeholder="Industry" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All industries</SelectItem>
          {TARGET_INDUSTRIES.map((i) => (
            <SelectItem key={i} value={i}>
              {i}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("country") ?? "all"} onValueChange={(v) => setParam("country", v === "all" ? null : v)}>
        <SelectTrigger size="sm" className="w-36">
          <SelectValue placeholder="Country" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All countries</SelectItem>
          {COUNTRIES.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("minScore") ?? "0"} onValueChange={(v) => setParam("minScore", v === "0" ? null : v)}>
        <SelectTrigger size="sm" className="w-32">
          <SelectValue placeholder="Min score" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="0">Any score</SelectItem>
          <SelectItem value="90">90+ (A+)</SelectItem>
          <SelectItem value="80">80+ (A)</SelectItem>
          <SelectItem value="70">70+ (B)</SelectItem>
          <SelectItem value="60">60+ (C)</SelectItem>
        </SelectContent>
      </Select>

      <div className="ml-auto flex items-center gap-1 rounded-md border p-0.5">
        <Button
          size="sm"
          variant="ghost"
          className={cn("h-7 px-2", view === "cards" && "bg-accent")}
          onClick={() => setParam("view", "cards")}
        >
          <LayoutGrid className="size-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className={cn("h-7 px-2", view === "pipeline" && "bg-accent")}
          onClick={() => setParam("view", "pipeline")}
        >
          <Kanban className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
