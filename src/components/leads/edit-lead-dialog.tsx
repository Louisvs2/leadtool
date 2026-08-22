"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Loader2 } from "lucide-react";
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

export type EditableLead = {
  companyName: string;
  website: string;
  industry: string;
  country: string;
  city: string;
  companySizeMin: string;
  companySizeMax: string;
  description: string;
  contactName: string;
  contactRole: string;
  contactEmail: string;
  linkedinUrl: string;
};

export function EditLeadDialog({ leadId, initial }: { leadId: string; initial: EditableLead }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initial);

  function set<K extends keyof EditableLead>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.companyName.trim()) {
      toast.error("Company name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: form.companyName,
          website: form.website,
          industry: form.industry,
          country: form.country,
          city: form.city,
          companySizeMin: form.companySizeMin ? Number(form.companySizeMin) : undefined,
          companySizeMax: form.companySizeMax ? Number(form.companySizeMax) : undefined,
          description: form.description,
          contactName: form.contactName,
          contactRole: form.contactRole,
          contactEmail: form.contactEmail,
          linkedinUrl: form.linkedinUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save changes");
      toast.success("Lead updated");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (setOpen(v), v && setForm(initial))}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Pencil /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit lead</DialogTitle>
          <DialogDescription>Corrects the company/contact record — doesn&apos;t re-run research automatically.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="e-companyName">Company name *</Label>
            <Input id="e-companyName" value={form.companyName} onChange={(e) => set("companyName", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="e-website">Website</Label>
              <Input id="e-website" value={form.website} onChange={(e) => set("website", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-industry">Industry</Label>
              <Input id="e-industry" value={form.industry} onChange={(e) => set("industry", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="e-country">Country</Label>
              <Input id="e-country" value={form.country} onChange={(e) => set("country", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-city">City</Label>
              <Input id="e-city" value={form.city} onChange={(e) => set("city", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="e-sizeMin">Company size (min)</Label>
              <Input id="e-sizeMin" type="number" value={form.companySizeMin} onChange={(e) => set("companySizeMin", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-sizeMax">Company size (max)</Label>
              <Input id="e-sizeMax" type="number" value={form.companySizeMax} onChange={(e) => set("companySizeMax", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-description">Description / notes</Label>
            <Textarea id="e-description" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>

          <div className="border-t pt-4">
            <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Contact</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="e-contactName">Name</Label>
                <Input id="e-contactName" value={form.contactName} onChange={(e) => set("contactName", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-contactRole">Role</Label>
                <Input id="e-contactRole" value={form.contactRole} onChange={(e) => set("contactRole", e.target.value)} />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="e-contactEmail">Email</Label>
                <Input id="e-contactEmail" type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-linkedinUrl">LinkedIn</Label>
                <Input id="e-linkedinUrl" value={form.linkedinUrl} onChange={(e) => set("linkedinUrl", e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Pencil />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
