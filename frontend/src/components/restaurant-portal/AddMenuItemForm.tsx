"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddMenuItemForm() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get("name") as string,
      description: (fd.get("description") as string) || null,
      price: Number(fd.get("price")),
      category: fd.get("category") as string,
      dietaryInfo: (fd.get("dietaryInfo") as string)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      isAvailable: true,
    };

    setLoading(true);
    const res = await fetch("/api/proxy/restaurant-portal/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);

    if (!res.ok) {
      setError("Failed to add item");
      return;
    }
    setOpen(false);
    router.refresh();
  };

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>+ Add Menu Item</Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border bg-white p-6 space-y-4 max-w-lg">
      <h3 className="font-semibold text-slate-800">New Menu Item</h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1 col-span-2">
          <Label htmlFor="name">Name *</Label>
          <Input id="name" name="name" required />
        </div>
        <div className="space-y-1 col-span-2">
          <Label htmlFor="description">Description</Label>
          <Input id="description" name="description" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="price">Price (LKR) *</Label>
          <Input id="price" name="price" type="number" min="0" step="0.01" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="category">Category *</Label>
          <Input id="category" name="category" required />
        </div>
        <div className="space-y-1 col-span-2">
          <Label htmlFor="dietaryInfo">Dietary Info (comma-separated)</Label>
          <Input id="dietaryInfo" name="dietaryInfo" placeholder="Vegetarian, Halal" />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>{loading ? "Adding…" : "Add Item"}</Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
