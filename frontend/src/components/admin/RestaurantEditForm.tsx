"use client";

import { useState } from "react";
import { AdminRestaurantDetail } from "@/types/admin";
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
import { useRouter } from "next/navigation";

interface RestaurantEditFormProps {
  restaurant: AdminRestaurantDetail;
}

export function RestaurantEditForm({ restaurant }: RestaurantEditFormProps) {
  const [form, setForm] = useState({
    name: restaurant.name,
    description: restaurant.description ?? "",
    address: restaurant.address,
    area: restaurant.area,
    phone: restaurant.phone ?? "",
    email: restaurant.email ?? "",
    website: restaurant.website ?? "",
    priceRange: restaurant.priceRange,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  const handleChange =
    (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(
        `/api/proxy/admin/restaurants/${restaurant.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      if (res.ok) {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={form.name} onChange={handleChange("name")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="area">Area</Label>
          <Input id="area" value={form.area} onChange={handleChange("area")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={form.address}
            onChange={handleChange("address")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="priceRange">Price Range</Label>
          <Select
            value={form.priceRange}
            onValueChange={(v) =>
              setForm((p) => ({ ...p, priceRange: v as typeof form.priceRange }))
            }
          >
            <SelectTrigger id="priceRange">
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
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={form.phone}
            onChange={handleChange("phone")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={handleChange("email")}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            value={form.website}
            onChange={handleChange("website")}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={form.description}
            onChange={handleChange("description")}
            rows={4}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </Button>
        {saved && (
          <span className="text-sm text-green-600">Changes saved!</span>
        )}
      </div>
    </form>
  );
}
