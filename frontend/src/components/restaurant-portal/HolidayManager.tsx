"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, CalendarOff } from "lucide-react";

interface Holiday {
  id: string;
  date: string;
  reason: string | null;
}

export function HolidayManager() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/proxy/restaurant-portal/holidays")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { setHolidays(data as Holiday[]); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;
    setSaving(true);
    const res = await fetch("/api/proxy/restaurant-portal/holidays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, reason: reason || undefined }),
    });
    if (res.ok) {
      const created = await res.json() as Holiday;
      setHolidays((p) => [...p, created].sort((a, b) => a.date.localeCompare(b.date)));
      setDate("");
      setReason("");
    }
    setSaving(false);
  };

  const remove = async (dateStr: string) => {
    await fetch(`/api/proxy/restaurant-portal/holidays/${dateStr}`, { method: "DELETE" });
    setHolidays((p) => p.filter((h) => h.date.slice(0, 10) !== dateStr));
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="max-w-lg space-y-6">
      {/* Add form */}
      <form onSubmit={add} className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold">Add a Holiday</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="hdate">Date</Label>
            <Input id="hdate" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hreason">Reason (optional)</Label>
            <Input id="hreason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Public holiday" />
          </div>
        </div>
        <Button type="submit" disabled={saving} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          {saving ? "Saving…" : "Add Holiday"}
        </Button>
      </form>

      {/* List */}
      {holidays.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-card/50 py-12 text-center">
          <CalendarOff className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No holidays scheduled.</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card divide-y overflow-hidden">
          {holidays.map((h) => {
            const dateStr = h.date.slice(0, 10);
            return (
              <div key={h.id} className="flex items-center justify-between px-4 py-3 gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", {
                      weekday: "short", day: "numeric", month: "long", year: "numeric",
                    })}
                  </p>
                  {h.reason && <p className="text-xs text-muted-foreground">{h.reason}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-600 hover:bg-red-500/10 shrink-0"
                  onClick={() => remove(dateStr)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
