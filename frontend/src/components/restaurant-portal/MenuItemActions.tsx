"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Pencil, X } from "lucide-react";
import { ImageUploader } from "./ImageUploader";

// ── Toggle availability ───────────────────────────────────────────────────────

export function ToggleAvailabilityButton({
  itemId,
  isAvailable,
}: {
  itemId: string;
  isAvailable: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleToggle = async () => {
    setLoading(true);
    await fetch(`/api/proxy/restaurant-portal/menu/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: !isAvailable }),
    });
    setLoading(false);
    router.refresh();
  };

  return (
    <Button variant="outline" size="sm" onClick={handleToggle} disabled={loading}>
      {isAvailable ? "Mark Unavailable" : "Mark Available"}
    </Button>
  );
}

// ── Delete ────────────────────────────────────────────────────────────────────

export function DeleteMenuItemButton({ itemId }: { itemId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm("Delete this menu item?")) return;
    setLoading(true);
    await fetch(`/api/proxy/restaurant-portal/menu/${itemId}`, { method: "DELETE" });
    setLoading(false);
    router.refresh();
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleDelete} disabled={loading}>
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}

// ── Edit modal ────────────────────────────────────────────────────────────────

interface MenuItemData {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  dietaryInfo: string;
  isAvailable: boolean;
  imageUrl?: string | null;
}

export function EditMenuItemButton({ item }: { item: MenuItemData }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(item.imageUrl ?? null);
  const router = useRouter();

  const dietaryDefault = (() => {
    try { return (JSON.parse(item.dietaryInfo) as string[]).join(", "); } catch { return ""; }
  })();

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
      isAvailable: item.isAvailable,
      imageUrl: imageUrl ?? null,
    };

    setLoading(true);
    const res = await fetch(`/api/proxy/restaurant-portal/menu/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);

    if (!res.ok) {
      setError("Failed to update item");
      return;
    }
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4 text-muted-foreground" />
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="w-full max-w-lg rounded-xl border bg-card shadow-xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-base font-semibold text-foreground">Edit Menu Item</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded p-1 hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2">
                  <Label htmlFor="edit-name">Name *</Label>
                  <Input id="edit-name" name="name" defaultValue={item.name} required />
                </div>

                <div className="space-y-1 col-span-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Input id="edit-description" name="description" defaultValue={item.description ?? ""} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-price">Price (LKR) *</Label>
                  <Input
                    id="edit-price"
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={item.price}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-category">Category *</Label>
                  <Input id="edit-category" name="category" defaultValue={item.category} required />
                </div>

                <div className="space-y-1 col-span-2">
                  <Label htmlFor="edit-dietary">Dietary Info (comma-separated)</Label>
                  <Input
                    id="edit-dietary"
                    name="dietaryInfo"
                    defaultValue={dietaryDefault}
                    placeholder="Vegetarian, Halal"
                  />
                </div>

                <div className="space-y-1 col-span-2">
                  <Label>Item Photo</Label>
                  <ImageUploader
                    endpoint="menuItemImage"
                    value={imageUrl}
                    onChange={setImageUrl}
                    label="Upload item photo"
                  />
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving…" : "Save Changes"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
