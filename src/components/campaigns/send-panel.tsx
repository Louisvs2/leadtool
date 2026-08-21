"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Send, PlayCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CampaignStatus } from "@prisma/client";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const COMPLIANCE_ITEMS = [
  "Contact data was sourced from lawfully accessible sources only.",
  "This campaign complies with applicable email marketing law (e.g. GDPR / UWG / CAN-SPAM).",
  "Opt-outs and unsubscribe requests will be respected immediately.",
  "No private (non-business) contact details are being used.",
  "No misleading claims are made in this campaign's messaging.",
  "Only leads that were individually reviewed and approved will be contacted.",
];

export function SendPanel({
  campaignId,
  status,
  approvedCount,
  queuedOrSentCount,
  initialSchedule,
  initialCompliance,
}: {
  campaignId: string;
  status: CampaignStatus;
  approvedCount: number;
  queuedOrSentCount: number;
  initialSchedule: {
    sendWindowStart: string;
    sendWindowEnd: string;
    sendDaysOfWeek: string;
    maxSendsPerDay: number;
    minDelaySeconds: number;
    maxDelaySeconds: number;
    followup1Days: number;
    followup2Days: number;
    followup3Days: number;
    followupsEnabled: boolean;
  };
  initialCompliance: boolean;
}) {
  const router = useRouter();
  const [schedule, setSchedule] = useState(initialSchedule);
  const [checked, setChecked] = useState<boolean[]>(new Array(COMPLIANCE_ITEMS.length).fill(initialCompliance));
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [processing, setProcessing] = useState(false);

  const allChecked = checked.every(Boolean);
  const alreadyActive = status === "ACTIVE" || status === "COMPLETED";

  async function saveSchedule() {
    setSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(schedule),
      });
      if (!res.ok) throw new Error();
      toast.success("Schedule saved");
    } catch {
      toast.error("Failed to save schedule");
    } finally {
      setSaving(false);
    }
  }

  async function handleSend() {
    setSending(true);
    try {
      await fetch(`/api/campaigns/${campaignId}/compliance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed: true }),
      });
      const res = await fetch(`/api/campaigns/${campaignId}/send`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      toast.success(`${data.queued} messages queued for sending`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  async function handleProcessNow() {
    setProcessing(true);
    try {
      const res = await fetch("/api/sending/process", { method: "POST" });
      const data = await res.json();
      toast.success(`Dispatched ${data.send.sent} email(s)`);
      router.refresh();
    } catch {
      toast.error("Failed to process queue");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Sending schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Window start</Label>
              <Input type="time" value={schedule.sendWindowStart} onChange={(e) => setSchedule({ ...schedule, sendWindowStart: e.target.value })} disabled={alreadyActive} />
            </div>
            <div className="space-y-1.5">
              <Label>Window end</Label>
              <Input type="time" value={schedule.sendWindowEnd} onChange={(e) => setSchedule({ ...schedule, sendWindowEnd: e.target.value })} disabled={alreadyActive} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Sending days</Label>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((day) => {
                const days = schedule.sendDaysOfWeek.split(",").filter(Boolean);
                const active = days.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={alreadyActive}
                    onClick={() => {
                      const next = active ? days.filter((d) => d !== day) : [...days, day];
                      setSchedule({ ...schedule, sendDaysOfWeek: next.join(",") });
                    }}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium ${active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Max sends / day</Label>
              <Input type="number" value={schedule.maxSendsPerDay} onChange={(e) => setSchedule({ ...schedule, maxSendsPerDay: Number(e.target.value) })} disabled={alreadyActive} />
            </div>
            <div className="space-y-1.5">
              <Label>Min delay (sec)</Label>
              <Input type="number" value={schedule.minDelaySeconds} onChange={(e) => setSchedule({ ...schedule, minDelaySeconds: Number(e.target.value) })} disabled={alreadyActive} />
            </div>
            <div className="space-y-1.5">
              <Label>Max delay (sec)</Label>
              <Input type="number" value={schedule.maxDelaySeconds} onChange={(e) => setSchedule({ ...schedule, maxDelaySeconds: Number(e.target.value) })} disabled={alreadyActive} />
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-3">
            <Label htmlFor="followupsEnabled">Automated follow-ups</Label>
            <Switch id="followupsEnabled" checked={schedule.followupsEnabled} onCheckedChange={(v) => setSchedule({ ...schedule, followupsEnabled: v })} disabled={alreadyActive} />
          </div>
          {schedule.followupsEnabled && (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Follow-up #1 (days)</Label>
                <Input type="number" value={schedule.followup1Days} onChange={(e) => setSchedule({ ...schedule, followup1Days: Number(e.target.value) })} disabled={alreadyActive} />
              </div>
              <div className="space-y-1.5">
                <Label>Follow-up #2 (days)</Label>
                <Input type="number" value={schedule.followup2Days} onChange={(e) => setSchedule({ ...schedule, followup2Days: Number(e.target.value) })} disabled={alreadyActive} />
              </div>
              <div className="space-y-1.5">
                <Label>Follow-up #3 (days)</Label>
                <Input type="number" value={schedule.followup3Days} onChange={(e) => setSchedule({ ...schedule, followup3Days: Number(e.target.value) })} disabled={alreadyActive} />
              </div>
            </div>
          )}

          {!alreadyActive && (
            <Button size="sm" variant="outline" onClick={saveSchedule} disabled={saving}>
              {saving && <Loader2 className="animate-spin" />} Save schedule
            </Button>
          )}
        </CardContent>
      </Card>

      {!alreadyActive && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShieldCheck className="size-4" /> Compliance checklist
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {COMPLIANCE_ITEMS.map((item, i) => (
              <label key={item} className="flex items-start gap-2.5 text-sm">
                <Checkbox
                  checked={checked[i]}
                  onCheckedChange={(v) =>
                    setChecked((prev) => prev.map((c, idx) => (idx === i ? Boolean(v) : c)))
                  }
                />
                <span>{item}</span>
              </label>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-4">
        {alreadyActive ? (
          <>
            <p className="text-sm">
              <span className="font-medium">{queuedOrSentCount}</span> messages queued/sent for this campaign.
            </p>
            <Button size="sm" variant="outline" className="ml-auto" onClick={handleProcessNow} disabled={processing}>
              {processing ? <Loader2 className="animate-spin" /> : <PlayCircle />}
              Process due sends now
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{approvedCount} approved messages ready to queue.</p>
            <Button className="ml-auto" onClick={handleSend} disabled={!allChecked || approvedCount === 0 || sending}>
              {sending ? <Loader2 className="animate-spin" /> : <Send />}
              Send Campaign
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
