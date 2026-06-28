"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, ToggleLeft, ToggleRight } from "lucide-react";

interface Promotion {
  id: string;
  title: string;
  description: string;
  type: string;
  discountValue: number | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  imageUrl: string | null;
}

const TYPES = ["DISCOUNT", "HAPPY_HOUR", "SPECIAL_EVENT", "SEASONAL", "COUPON"] as const;

const TYPE_LABEL: Record<string, string> = {
  DISCOUNT: "Discount", HAPPY_HOUR: "Happy Hour", SPECIAL_EVENT: "Special Event",
  SEASONAL: "Seasonal", COUPON: "Coupon",
};

function PromotionCard({ promo, onToggle, onDelete }: {
  promo: Promotion;
  onToggle: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground">{promo.title}</h3>
            <Badge variant={promo.isActive ? "default" : "secondary"}>{promo.isActive ? "Active" : "Inactive"}</Badge>
            <Badge variant="outline">{TYPE_LABEL[promo.type] ?? promo.type}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{promo.description}</p>
          {promo.discountValue != null && (
            <p className="text-sm font-medium text-primary">{promo.discountValue}% off</p>
          )}
          <p className="text-xs text-muted-foreground">
            {new Date(promo.startDate).toLocaleDateString("en-LK")} –{" "}
            {new Date(promo.endDate).toLocaleDateString("en-LK")}
          </p>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => onToggle(promo.id, promo.isActive)}
            className={promo.isActive ? "text-amber-500" : "text-green-500"}>
            {promo.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => onDelete(promo.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PromotionsClient({ initial }: { initial: Promotion[] }) {
  const [promotions, setPromotions] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      title: fd.get("title") as string,
      description: fd.get("description") as string,
      type: fd.get("type") as string,
      discountValue: fd.get("discountValue") ? Number(fd.get("discountValue")) : null,
      startDate: fd.get("startDate") as string,
      endDate: fd.get("endDate") as string,
      isActive: true,
    };
    setSaving(true);
    const res = await fetch("/api/proxy/restaurant-portal/promotions", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      const created = await res.json() as Promotion;
      setPromotions((p) => [created, ...p]);
      setShowForm(false);
    }
  };

  const toggle = async (id: string, current: boolean) => {
    const res = await fetch(`/api/proxy/restaurant-portal/promotions/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    if (res.ok) setPromotions((p) => p.map((pr) => pr.id === id ? { ...pr, isActive: !current } : pr));
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/proxy/restaurant-portal/promotions/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) setPromotions((p) => p.filter((pr) => pr.id !== id));
  };

  return (
    <div className="space-y-4">
      {!showForm && (
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Promotion
        </Button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-6 space-y-4 max-w-lg">
          <h3 className="font-semibold">New Promotion</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required placeholder="Summer Special" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" required rows={2} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="type">Type</Label>
              <select id="type" name="type" required className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="discountValue">Discount % (optional)</Label>
              <Input id="discountValue" name="discountValue" type="number" min="0" max="100" placeholder="10" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" name="startDate" type="date" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="endDate">End Date</Label>
              <Input id="endDate" name="endDate" type="date" required />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Create"}</Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {promotions.length === 0 && !showForm ? (
        <div className="rounded-xl border bg-card py-16 text-center text-muted-foreground">
          No promotions yet. Create your first offer!
        </div>
      ) : (
        <div className="space-y-3">
          {promotions.map((p) => (
            <PromotionCard key={p.id} promo={p} onToggle={toggle} onDelete={remove} />
          ))}
        </div>
      )}
    </div>
  );
}
