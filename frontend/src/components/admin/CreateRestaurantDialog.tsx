"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

const EMPTY_FORM = {
  name: "",
  address: "",
  area: "",
  priceRange: "MODERATE" as "BUDGET" | "MODERATE" | "EXPENSIVE" | "FINE_DINING",
  cuisineTypes: "",
  phone: "",
  email: "",
  website: "",
  description: "",
  adminEmail: "",
};

export function CreateRestaurantDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handle =
    (field: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = {
        name: form.name,
        address: form.address,
        area: form.area,
        priceRange: form.priceRange,
        cuisineTypes: form.cuisineTypes
          ? form.cuisineTypes.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        ...(form.phone ? { phone: form.phone } : {}),
        ...(form.email ? { email: form.email } : {}),
        ...(form.website ? { website: form.website } : {}),
        ...(form.description ? { description: form.description } : {}),
        ...(form.adminEmail ? { adminEmail: form.adminEmail } : {}),
      };
      const res = await fetch("/api/proxy/admin/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Failed to create restaurant");
      }
      setOpen(false);
      setForm(EMPTY_FORM);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Add Restaurant
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Restaurant</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cr-name">Name *</Label>
              <Input
                id="cr-name"
                value={form.name}
                onChange={handle("name")}
                required
                placeholder="e.g. Ministry of Crab"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cr-area">Area *</Label>
              <Input
                id="cr-area"
                value={form.area}
                onChange={handle("area")}
                required
                placeholder="e.g. Colombo 01"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="cr-address">Address *</Label>
              <Input
                id="cr-address"
                value={form.address}
                onChange={handle("address")}
                required
                placeholder="Street address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cr-price">Price Range *</Label>
              <Select
                value={form.priceRange}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    priceRange: v as typeof form.priceRange,
                  }))
                }
              >
                <SelectTrigger id="cr-price">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUDGET">Budget</SelectItem>
                  <SelectItem value="MODERATE">Moderate</SelectItem>
                  <SelectItem value="EXPENSIVE">Expensive</SelectItem>
                  <SelectItem value="FINE_DINING">Fine Dining</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cr-cuisines">Cuisine Types</Label>
              <Input
                id="cr-cuisines"
                value={form.cuisineTypes}
                onChange={handle("cuisineTypes")}
                placeholder="Sri Lankan, Seafood (comma-separated)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cr-phone">Phone</Label>
              <Input
                id="cr-phone"
                value={form.phone}
                onChange={handle("phone")}
                placeholder="+94 11 234 5678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cr-email">Email</Label>
              <Input
                id="cr-email"
                type="email"
                value={form.email}
                onChange={handle("email")}
                placeholder="restaurant@example.com"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="cr-website">Website</Label>
              <Input
                id="cr-website"
                value={form.website}
                onChange={handle("website")}
                placeholder="https://example.com"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="cr-admin-email">
                Restaurant Admin Email
              </Label>
              <Input
                id="cr-admin-email"
                type="email"
                value={form.adminEmail}
                onChange={handle("adminEmail")}
                placeholder="owner@restaurant.com"
              />
              <p className="text-xs text-muted-foreground">
                An account will be created for this email and a password-setup link will be sent. Leave blank to assign yourself.
              </p>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="cr-desc">Description</Label>
              <Textarea
                id="cr-desc"
                value={form.description}
                onChange={handle("description")}
                rows={3}
                placeholder="Brief description of the restaurant…"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create Restaurant"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
