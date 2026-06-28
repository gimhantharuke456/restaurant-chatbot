"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Save } from "lucide-react";

interface Slot { time: string; totalTables: number; bookedTables: number; available: boolean }

export function AvailabilityManager() {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchSlots = async () => {
    setLoading(true);
    const res = await fetch(`/api/proxy/restaurant-portal/availability/${date}`);
    if (res.ok) setSlots(await res.json() as Slot[]);
    setLoaded(true);
    setLoading(false);
  };

  const save = async () => {
    setSaving(true);
    await fetch(`/api/proxy/restaurant-portal/availability/${date}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slots }),
    });
    setSaving(false);
  };

  const addSlot = () => setSlots((p) => [...p, { time: "12:00", totalTables: 5, bookedTables: 0, available: true }]);
  const removeSlot = (i: number) => setSlots((p) => p.filter((_, idx) => idx !== i));
  const updateSlot = (i: number, field: keyof Slot, value: string | number | boolean) =>
    setSlots((p) => p.map((s, idx) => idx === i ? { ...s, [field]: value } : s));

  return (
    <div className="max-w-xl space-y-4">
      <div className="flex items-end gap-3">
        <div className="space-y-1 flex-1">
          <Label htmlFor="date">Select Date</Label>
          <Input id="date" type="date" value={date} onChange={(e) => { setDate(e.target.value); setLoaded(false); }} />
        </div>
        <Button onClick={fetchSlots} disabled={loading}>{loading ? "Loading…" : "Load Slots"}</Button>
      </div>

      {loaded && (
        <>
          {slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No slots configured for this date.</p>
          ) : (
            <div className="space-y-2">
              {slots.map((slot, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                  <Input type="time" value={slot.time} onChange={(e) => updateSlot(i, "time", e.target.value)} className="w-28" />
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>Tables:</span>
                    <Input type="number" min="0" value={slot.totalTables} onChange={(e) => updateSlot(i, "totalTables", Number(e.target.value))} className="w-16 h-8" />
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                    <input type="checkbox" checked={slot.available} onChange={(e) => updateSlot(i, "available", e.target.checked)} />
                    Available
                  </label>
                  <Button variant="ghost" size="sm" className="text-red-500 ml-auto" onClick={() => removeSlot(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={addSlot}><Plus className="h-4 w-4 mr-1" /> Add Slot</Button>
            <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-1" />{saving ? "Saving…" : "Save"}</Button>
          </div>
        </>
      )}
    </div>
  );
}
