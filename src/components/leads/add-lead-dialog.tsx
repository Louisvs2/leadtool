"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const EMPTY = {
  companyName: "",
  website: "",
  industry: "",
  country: "",
  city: "",
  companySizeMin: "",
  companySizeMax: "",
  description: "",
  contactName: "",
  contactRole: "",
  contactEmail: "",
  linkedinUrl: "",
};

export function AddLeadDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);

  function set<K extends keyof typeof EMPTY>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.companyName.trim()) {
      toast.error("Company name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: form.companyName,
          website: form.website || undefined,
          industry: form.industry || undefined,
          country: form.country || undefined,
          city: form.city || undefined,
          companySizeMin: form.companySizeMin ? Number(form.companySizeMin) : undefined,
          companySizeMax: form.companySizeMax ? Number(form.companySizeMax) : undefined,
          description: form.description || undefined,
          contactName: form.contactName || undefined,
          contactRole: form.contactRole || undefined,
          contactEmail: form.contactEmail || undefined,
          linkedinUrl: form.linkedinUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add lead");
      toast.success(`${form.companyName} added`);
      setForm(EMPTY);
      setOpen(false);
      router.push(`/leads/${data.lead.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add lead");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus /> Add Lead
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a lead manually</DialogTitle>
          <DialogDescription>You&apos;ll be taken to the lead&apos;s page to run research once it&apos;s created.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="companyName">Company name *</Label>
            <Input id="companyName" value={form.companyName} onChange={(e) => set("companyName", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="website">Website</Label>
              <Input id="website" value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" value={form.industry} onChange={(e) => set("industry", e.target.value)} placeholder="e.g. Fashion" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="country">Country</Label>
              <Input id="country" value={form.country} onChange={(e) => set("country", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city} onChange={(e) => set("city", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sizeMin">Company size (min)</Label>
              <Input id="sizeMin" type="number" value={form.companySizeMin} onChange={(e) => set("companySizeMin", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sizeMax">Company size (max)</Label>
              <Input id="sizeMax" type="number" value={form.companySizeMax} onChange={(e) => set("companySizeMax", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description / notes</Label>
            <Textarea id="description" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>

          <div className="border-t pt-4">
            <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Contact</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="contactName">Name</Label>
                <Input id="contactName" value={form.contactName} onChange={(e) => set("contactName", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contactRole">Role</Label>
                <Input id="contactRole" value={form.contactRole} onChange={(e) => set("contactRole", e.target.value)} />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="contactEmail">Email</Label>
                <Input id="contactEmail" type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="linkedinUrl">LinkedIn</Label>
                <Input id="linkedinUrl" value={form.linkedinUrl} onChange={(e) => set("linkedinUrl", e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <UserPlus />} Add Lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
