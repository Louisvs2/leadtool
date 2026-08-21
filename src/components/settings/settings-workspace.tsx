"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, ShieldCheck, ShieldAlert, Trash2, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import type { Settings, SuppressionEntry } from "@prisma/client";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export function SettingsWorkspace({
  settings: initialSettings,
  suppressionEntries: initialEntries,
  providerStatus,
}: {
  settings: Settings;
  suppressionEntries: SuppressionEntry[];
  providerStatus: { ai: boolean; email: { mock: boolean; resend: boolean; sendgrid: boolean; smtp: boolean } };
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [entries, setEntries] = useState(initialEntries);
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  async function save(section: string, patch: Partial<Settings>) {
    setSaving(section);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setSettings(data.settings);
      toast.success("Saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setSaving(null);
    }
  }

  async function addSuppression() {
    if (!newEmail.trim()) return;
    try {
      const res = await fetch("/api/suppression", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, note: "Added manually" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add");
      setEntries(data.entries);
      setNewEmail("");
      toast.success("Added to suppression list");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add");
    }
  }

  async function removeSuppression(id: string) {
    try {
      await fetch(`/api/suppression/${id}`, { method: "DELETE" });
      setEntries((prev) => prev.filter((e) => e.id !== id));
      toast.success("Removed");
    } catch {
      toast.error("Failed to remove");
    }
  }

  return (
    <Tabs defaultValue="company">
      <TabsList className="flex-wrap">
        <TabsTrigger value="company">Company</TabsTrigger>
        <TabsTrigger value="sender">Sender &amp; Pitch</TabsTrigger>
        <TabsTrigger value="sending">Sending &amp; Follow-ups</TabsTrigger>
        <TabsTrigger value="providers">Providers</TabsTrigger>
        <TabsTrigger value="suppression">Suppression ({entries.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="company" className="pt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Company Profile</CardTitle>
            <CardDescription>How CultTwenty positions itself in every generated email.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Company name</Label>
                <Input value={settings.companyName} onChange={(e) => setSettings({ ...settings, companyName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Website</Label>
                <Input value={settings.companyWebsite} onChange={(e) => setSettings({ ...settings, companyWebsite: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Positioning</Label>
              <Input value={settings.positioning} onChange={(e) => setSettings({ ...settings, positioning: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Capabilities</Label>
                <Input value={settings.capabilities} onChange={(e) => setSettings({ ...settings, capabilities: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Target project size</Label>
                <Input value={settings.targetProjectSize} onChange={(e) => setSettings({ ...settings, targetProjectSize: e.target.value })} />
              </div>
            </div>
            <Button
              size="sm"
              onClick={() =>
                save("company", {
                  companyName: settings.companyName,
                  companyWebsite: settings.companyWebsite,
                  positioning: settings.positioning,
                  capabilities: settings.capabilities,
                  targetProjectSize: settings.targetProjectSize,
                })
              }
              disabled={saving !== null}
            >
              {saving === "company" ? <Loader2 className="animate-spin" /> : <Save />} Save
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="sender" className="pt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Sender &amp; Pitch</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Sender name</Label>
                <Input value={settings.senderName} onChange={(e) => setSettings({ ...settings, senderName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Sender email</Label>
                <Input value={settings.senderEmail} onChange={(e) => setSettings({ ...settings, senderEmail: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reply-to</Label>
              <Input value={settings.replyTo} onChange={(e) => setSettings({ ...settings, replyTo: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Pitch URL</Label>
              <Input value={settings.pitchUrl} onChange={(e) => setSettings({ ...settings, pitchUrl: e.target.value })} />
              <p className="text-xs text-muted-foreground">The AI decides per-email whether including this link makes sense.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Default signature</Label>
              <Textarea rows={3} value={settings.signature} onChange={(e) => setSettings({ ...settings, signature: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Unsubscribe text</Label>
              <Textarea rows={2} value={settings.unsubscribeText} onChange={(e) => setSettings({ ...settings, unsubscribeText: e.target.value })} />
            </div>
            <Button
              size="sm"
              onClick={() =>
                save("sender", {
                  senderName: settings.senderName,
                  senderEmail: settings.senderEmail,
                  replyTo: settings.replyTo,
                  pitchUrl: settings.pitchUrl,
                  signature: settings.signature,
                  unsubscribeText: settings.unsubscribeText,
                })
              }
              disabled={saving !== null}
            >
              {saving === "sender" ? <Loader2 className="animate-spin" /> : <Save />} Save
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="sending" className="pt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Default sending limits</CardTitle>
            <CardDescription>Applied to new campaigns unless overridden per-campaign.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Window start</Label>
                <Input type="time" value={settings.sendWindowStart} onChange={(e) => setSettings({ ...settings, sendWindowStart: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Window end</Label>
                <Input type="time" value={settings.sendWindowEnd} onChange={(e) => setSettings({ ...settings, sendWindowEnd: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Sending days</Label>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map((day) => {
                  const days = settings.sendDaysOfWeek.split(",").filter(Boolean);
                  const active = days.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        const next = active ? days.filter((d) => d !== day) : [...days, day];
                        setSettings({ ...settings, sendDaysOfWeek: next.join(",") });
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
                <Input type="number" value={settings.maxSendsPerDay} onChange={(e) => setSettings({ ...settings, maxSendsPerDay: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Min delay (sec)</Label>
                <Input type="number" value={settings.minDelaySeconds} onChange={(e) => setSettings({ ...settings, minDelaySeconds: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Max delay (sec)</Label>
                <Input type="number" value={settings.maxDelaySeconds} onChange={(e) => setSettings({ ...settings, maxDelaySeconds: Number(e.target.value) })} />
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <Label htmlFor="followups-enabled">Automated follow-ups</Label>
              <Switch id="followups-enabled" checked={settings.followupsEnabled} onCheckedChange={(v) => setSettings({ ...settings, followupsEnabled: v })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Follow-up #1 (days)</Label>
                <Input type="number" value={settings.followup1Days} onChange={(e) => setSettings({ ...settings, followup1Days: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Follow-up #2 (days)</Label>
                <Input type="number" value={settings.followup2Days} onChange={(e) => setSettings({ ...settings, followup2Days: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Follow-up #3 (days)</Label>
                <Input type="number" value={settings.followup3Days} onChange={(e) => setSettings({ ...settings, followup3Days: Number(e.target.value) })} />
              </div>
            </div>

            <Button
              size="sm"
              onClick={() =>
                save("sending", {
                  sendWindowStart: settings.sendWindowStart,
                  sendWindowEnd: settings.sendWindowEnd,
                  sendDaysOfWeek: settings.sendDaysOfWeek,
                  maxSendsPerDay: settings.maxSendsPerDay,
                  minDelaySeconds: settings.minDelaySeconds,
                  maxDelaySeconds: settings.maxDelaySeconds,
                  followupsEnabled: settings.followupsEnabled,
                  followup1Days: settings.followup1Days,
                  followup2Days: settings.followup2Days,
                  followup3Days: settings.followup3Days,
                })
              }
              disabled={saving !== null}
            >
              {saving === "sending" ? <Loader2 className="animate-spin" /> : <Save />} Save
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="providers" className="space-y-4 pt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">AI</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm">
              {providerStatus.ai ? (
                <Badge variant="success">
                  <ShieldCheck /> OpenAI configured
                </Badge>
              ) : (
                <Badge variant="warning">
                  <ShieldAlert /> Running in AI Mock Mode
                </Badge>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Set <code>OPENAI_API_KEY</code> as an environment variable to enable live AI research summaries, scoring
              rationale and email copy. API keys are never stored in the database or exposed to the browser.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Email provider</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Active provider</Label>
              <Select value={settings.emailProvider} onValueChange={(v) => setSettings({ ...settings, emailProvider: v })}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mock">Mock (logs only)</SelectItem>
                  <SelectItem value="resend">Resend</SelectItem>
                  <SelectItem value="sendgrid">SendGrid</SelectItem>
                  <SelectItem value="smtp">SMTP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              {(["mock", "resend", "sendgrid", "smtp"] as const).map((p) => (
                <div key={p} className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5">
                  {providerStatus.email[p] ? (
                    <ShieldCheck className="size-3.5 text-success" />
                  ) : (
                    <ShieldAlert className="size-3.5 text-muted-foreground" />
                  )}
                  <span className="capitalize">{p}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Configure provider credentials via environment variables (RESEND_API_KEY, SENDGRID_API_KEY, or
              SMTP_HOST/SMTP_USER/SMTP_PASSWORD) — see .env.example.
            </p>
            <Button size="sm" onClick={() => save("provider", { emailProvider: settings.emailProvider })} disabled={saving !== null}>
              {saving === "provider" ? <Loader2 className="animate-spin" /> : <Save />} Save
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="suppression" className="pt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Suppression list</CardTitle>
            <CardDescription>These addresses will never be contacted again, across every campaign.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input placeholder="email@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              <Button onClick={addSuppression}>
                <Plus /> Add
              </Button>
            </div>
            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No suppressed addresses yet.</p>
            ) : (
              <ul className="divide-y">
                {entries.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <div>
                      <p className="font-medium">{entry.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.reason} · {formatDate(entry.createdAt)}
                        {entry.note ? ` · ${entry.note}` : ""}
                      </p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => removeSuppression(entry.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
