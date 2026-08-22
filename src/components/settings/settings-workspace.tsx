"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, ShieldCheck, ShieldAlert, Trash2, Plus, ExternalLink, Dices, UserPlus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { formatDate } from "@/lib/utils";
import type { Settings, SuppressionEntry } from "@prisma/client";
import type { MaskedSecrets } from "@/lib/secrets";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

// Derived from MaskedSecrets' keys (== SECRET_FIELDS) rather than a second
// hardcoded list, so this can't silently drift out of sync with what the
// API actually strips.
type SafeSettings = Omit<Settings, keyof MaskedSecrets>;

type TeamUser = { id: string; email: string; name: string | null; role: string; createdAt: Date };

function generateSecret() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, "").slice(0, 32);
}

/** A write-only secret input: never pre-filled with the real value, shows a "configured" badge instead. */
function SecretField({
  label,
  value,
  onChange,
  info,
  placeholder = "Not set",
  helpUrl,
  helpLabel,
  canGenerate = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  info: { configured: boolean; hint: string | null };
  placeholder?: string;
  helpUrl?: string;
  helpLabel?: string;
  canGenerate?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {info.configured ? (
          <Badge variant="success">
            <ShieldCheck /> configured ({info.hint})
          </Badge>
        ) : (
          <Badge variant="muted">
            <ShieldAlert /> not set
          </Badge>
        )}
      </div>
      <div className="flex gap-2">
        <Input
          type="password"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={info.configured ? "•••••••••••• (leave blank to keep current)" : placeholder}
        />
        {canGenerate && (
          <Button type="button" size="icon" variant="outline" title="Generate a random value" onClick={() => onChange(generateSecret())}>
            <Dices />
          </Button>
        )}
      </div>
      {helpUrl && (
        <a href={helpUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline">
          <ExternalLink className="size-3" /> {helpLabel ?? "Where do I get this?"}
        </a>
      )}
    </div>
  );
}

export function SettingsWorkspace({
  settings: initialSettings,
  secrets: initialSecrets,
  suppressionEntries: initialEntries,
  users: initialUsers,
  currentUserId,
  demoLeadCount: initialDemoLeadCount,
}: {
  settings: SafeSettings;
  secrets: MaskedSecrets;
  suppressionEntries: SuppressionEntry[];
  users: TeamUser[];
  currentUserId: string;
  demoLeadCount: number;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [secrets, setSecrets] = useState(initialSecrets);
  const [entries, setEntries] = useState(initialEntries);
  const [users, setUsers] = useState(initialUsers);
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  // Draft values for write-only secret inputs — separate from `settings`
  // so an empty draft never accidentally overwrites a saved key.
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [resendApiKey, setResendApiKey] = useState("");
  const [sendgridApiKey, setSendgridApiKey] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [graphTenantId, setGraphTenantId] = useState("");
  const [graphClientId, setGraphClientId] = useState("");
  const [graphClientSecret, setGraphClientSecret] = useState("");
  const [inboundWebhookSecret, setInboundWebhookSecret] = useState("");
  const [cronSecret, setCronSecret] = useState("");

  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [addingUser, setAddingUser] = useState(false);

  const [demoLeadCount, setDemoLeadCount] = useState(initialDemoLeadCount);
  const [clearingDemo, setClearingDemo] = useState(false);

  async function save(section: string, patch: Record<string, unknown>) {
    setSaving(section);
    try {
      // Never send an empty string for a secret field — omit it entirely so
      // the API's "only overwrite if non-empty" rule has nothing to trip on.
      // Also omit null/undefined: several optional Settings columns (e.g.
      // smtpPort) have no DB default, so a card that echoes `settings.x`
      // straight back into its own save call can otherwise submit a raw
      // `null`, which fails validation even though the field was never
      // touched by this save.
      const cleaned = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== "" && v !== null && v !== undefined));
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleaned),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setSettings(data.settings);
      setSecrets(data.secrets);
      toast.success("Saved");
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
      return false;
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

  async function addUser() {
    if (!newUserEmail.trim() || newUserPassword.length < 8) {
      toast.error("Email and a password of at least 8 characters are required.");
      return;
    }
    setAddingUser(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newUserEmail, name: newUserName || undefined, password: newUserPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add user");
      setUsers((prev) => [...prev, data.user]);
      setNewUserEmail("");
      setNewUserName("");
      setNewUserPassword("");
      toast.success(`${data.user.email} can now sign in`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add user");
    } finally {
      setAddingUser(false);
    }
  }

  async function removeUser(id: string) {
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to remove user");
      setUsers((prev) => prev.filter((u) => u.id !== id));
      toast.success("User removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove user");
    }
  }

  async function clearDemoData() {
    setClearingDemo(true);
    try {
      const res = await fetch("/api/demo-data", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to clear demo data");
      setDemoLeadCount(0);
      toast.success("Demo data cleared");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to clear demo data");
    } finally {
      setClearingDemo(false);
    }
  }

  return (
    <Tabs defaultValue="company">
      <TabsList className="flex-wrap">
        <TabsTrigger value="company">Company</TabsTrigger>
        <TabsTrigger value="sender">Sender &amp; Pitch</TabsTrigger>
        <TabsTrigger value="sending">Sending &amp; Follow-ups</TabsTrigger>
        <TabsTrigger value="apikeys">API Keys</TabsTrigger>
        <TabsTrigger value="team">Team ({users.length})</TabsTrigger>
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

        {demoLeadCount > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-sm">Demo data</CardTitle>
              <CardDescription>
                {demoLeadCount} demo lead{demoLeadCount === 1 ? "" : "s"} from the first-run walkthrough are still
                here, clearly labelled and safe (they can never be emailed) — but you&apos;ll want them gone once
                you&apos;re working with real leads.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive hover:text-destructive">
                    <Trash2 /> Clear demo data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear all demo data?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Removes all {demoLeadCount} demo leads and their companies, contacts, and research. Your real
                      leads, campaigns, and settings are untouched — this only ever targets records flagged as demo.
                      This can&apos;t be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={clearDemoData}
                      disabled={clearingDemo}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {clearingDemo && <Loader2 className="animate-spin" />} Clear demo data
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        )}
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

      <TabsContent value="apikeys" className="space-y-4 pt-4">
        <p className="text-sm text-muted-foreground">
          Enter API keys here — they&apos;re saved securely on the server and never shown again after saving, only a
          short hint so you know which key is active. Two exceptions stay in your hosting provider&apos;s environment
          variables instead (<code>DATABASE_URL</code>, <code>AUTH_SECRET</code>) — the app needs those before it can
          even reach its own database, so they&apos;re set once when you deploy, not here.
        </p>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">AI (OpenAI)</CardTitle>
            <CardDescription>Powers research summaries, scoring rationale and email copy. Without it, the app runs in a free deterministic Mock Mode instead — nothing breaks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SecretField
              label="OpenAI API key"
              value={openaiApiKey}
              onChange={setOpenaiApiKey}
              info={secrets.openaiApiKey}
              helpUrl="https://platform.openai.com/api-keys"
              helpLabel="Get a key at platform.openai.com/api-keys"
            />
            <Button size="sm" onClick={async () => (await save("openai", { openaiApiKey })) && setOpenaiApiKey("")} disabled={saving !== null}>
              {saving === "openai" ? <Loader2 className="animate-spin" /> : <Save />} Save
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Email sending</CardTitle>
            <CardDescription>Choose how outbound emails actually get sent.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Active provider</Label>
              <Select value={settings.emailProvider} onValueChange={(v) => setSettings({ ...settings, emailProvider: v })}>
                <SelectTrigger className="w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mock">Mock — log only, don&apos;t send</SelectItem>
                  <SelectItem value="resend">Resend</SelectItem>
                  <SelectItem value="sendgrid">SendGrid</SelectItem>
                  <SelectItem value="smtp">SMTP</SelectItem>
                  <SelectItem value="outlook">Outlook (Microsoft 365)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {settings.emailProvider === "mock" && (
              <p className="text-xs text-muted-foreground">Emails are logged, not actually sent — safe for testing the whole workflow.</p>
            )}

            {settings.emailProvider === "resend" && (
              <SecretField
                label="Resend API key"
                value={resendApiKey}
                onChange={setResendApiKey}
                info={secrets.resendApiKey}
                helpUrl="https://resend.com/api-keys"
                helpLabel="Get a key at resend.com/api-keys"
              />
            )}

            {settings.emailProvider === "sendgrid" && (
              <SecretField
                label="SendGrid API key"
                value={sendgridApiKey}
                onChange={setSendgridApiKey}
                info={secrets.sendgridApiKey}
                helpUrl="https://app.sendgrid.com/settings/api_keys"
                helpLabel="Get a key at app.sendgrid.com/settings/api_keys"
              />
            )}

            {settings.emailProvider === "smtp" && (
              <div className="space-y-3 rounded-lg border p-3">
                <SecretField label="SMTP host" value={smtpHost} onChange={setSmtpHost} info={secrets.smtpHost} placeholder="smtp.example.com" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Port</Label>
                    <Input value={settings.smtpPort ?? ""} onChange={(e) => setSettings({ ...settings, smtpPort: e.target.value })} placeholder="587" />
                  </div>
                  <div className="flex items-end justify-between pb-2">
                    <Label htmlFor="smtp-secure">Use TLS</Label>
                    <Switch id="smtp-secure" checked={settings.smtpSecure} onCheckedChange={(v) => setSettings({ ...settings, smtpSecure: v })} />
                  </div>
                </div>
                <SecretField label="SMTP username" value={smtpUser} onChange={setSmtpUser} info={secrets.smtpUser} />
                <SecretField label="SMTP password" value={smtpPassword} onChange={setSmtpPassword} info={secrets.smtpPassword} />
              </div>
            )}

            {settings.emailProvider === "outlook" && (
              <div className="space-y-3 rounded-lg border p-3">
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Sends and reads replies through your real Outlook/Microsoft 365 mailbox via an Azure app — no mailbox password needed. One-time setup:</p>
                  <ol className="list-decimal space-y-0.5 pl-4">
                    <li>
                      At{" "}
                      <a href="https://entra.microsoft.com" target="_blank" rel="noreferrer" className="underline hover:text-foreground">
                        entra.microsoft.com
                      </a>
                      : App registrations → New registration (any name, single tenant)
                    </li>
                    <li>API permissions → Add a permission → Microsoft Graph → <strong>Application</strong> permissions → add <code>Mail.Send</code> and <code>Mail.Read</code> → Grant admin consent</li>
                    <li>Certificates &amp; secrets → New client secret → copy its value immediately (shown once)</li>
                    <li>Copy the Tenant ID and Client ID from the app&apos;s Overview page</li>
                  </ol>
                </div>
                <SecretField label="Tenant ID" value={graphTenantId} onChange={setGraphTenantId} info={secrets.graphTenantId} />
                <SecretField label="Client ID" value={graphClientId} onChange={setGraphClientId} info={secrets.graphClientId} />
                <SecretField label="Client secret" value={graphClientSecret} onChange={setGraphClientSecret} info={secrets.graphClientSecret} />
                <div className="space-y-1.5">
                  <Label>Mailbox</Label>
                  <Input
                    value={settings.graphMailbox ?? ""}
                    onChange={(e) => setSettings({ ...settings, graphMailbox: e.target.value })}
                    placeholder="redaktion@culttwenty.de"
                  />
                  <p className="text-xs text-muted-foreground">The mailbox to send as and read replies from.</p>
                </div>
              </div>
            )}

            <Button
              size="sm"
              onClick={async () =>
                (await save("email-provider", {
                  emailProvider: settings.emailProvider,
                  smtpPort: settings.smtpPort,
                  smtpSecure: settings.smtpSecure,
                  graphMailbox: settings.graphMailbox,
                  resendApiKey,
                  sendgridApiKey,
                  smtpHost,
                  smtpUser,
                  smtpPassword,
                  graphTenantId,
                  graphClientId,
                  graphClientSecret,
                })) &&
                (setResendApiKey(""),
                setSendgridApiKey(""),
                setSmtpHost(""),
                setSmtpUser(""),
                setSmtpPassword(""),
                setGraphTenantId(""),
                setGraphClientId(""),
                setGraphClientSecret(""))
              }
              disabled={saving !== null}
            >
              {saving === "email-provider" ? <Loader2 className="animate-spin" /> : <Save />} Save
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Webhooks &amp; scheduled sending</CardTitle>
            <CardDescription>Self-chosen secrets — generate a random one and reuse it wherever your provider or scheduler asks for it.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SecretField
              label="Inbound webhook secret"
              value={inboundWebhookSecret}
              onChange={setInboundWebhookSecret}
              info={secrets.inboundWebhookSecret}
              canGenerate
            />
            <p className="-mt-2 text-xs text-muted-foreground">
              Paste this into your email provider&apos;s inbound-parse / event webhook URL as{" "}
              <code>?secret=...</code>, so replies and bounces reach <code>/api/inbound/email</code> and{" "}
              <code>/api/inbound/events</code>.
            </p>
            <SecretField label="Cron secret" value={cronSecret} onChange={setCronSecret} info={secrets.cronSecret} canGenerate />
            <p className="-mt-2 text-xs text-muted-foreground">
              Authenticates the scheduled job that actually dispatches queued emails and follow-ups
              (<code>/api/cron/process</code>) — used as an <code>Authorization: Bearer</code> header.
            </p>
            <Button
              size="sm"
              onClick={async () =>
                (await save("webhooks", { inboundWebhookSecret, cronSecret })) &&
                (setInboundWebhookSecret(""), setCronSecret(""))
              }
              disabled={saving !== null}
            >
              {saving === "webhooks" ? <Loader2 className="animate-spin" /> : <Save />} Save
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="team" className="pt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Team logins</CardTitle>
            <CardDescription>Only people you add here can sign in — there&apos;s no public sign-up.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <Input placeholder="Email" type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} />
              <Input placeholder="Name (optional)" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} />
              <Input placeholder="Password (min. 8 chars)" type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} />
              <Button onClick={addUser} disabled={addingUser}>
                {addingUser ? <Loader2 className="animate-spin" /> : <UserPlus />} Add
              </Button>
            </div>

            <ul className="divide-y">
              {users.map((user) => {
                const isSelf = user.id === currentUserId;
                const isLast = users.length === 1;
                return (
                  <li key={user.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <div>
                      <p className="font-medium">
                        {user.name || user.email} {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user.email} · added {formatDate(user.createdAt)}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={isSelf || isLast}
                      title={isSelf ? "You can't remove yourself" : isLast ? "At least one user must remain" : "Remove"}
                      onClick={() => removeUser(user.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                );
              })}
            </ul>
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
