"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Save, ChevronLeft, ChevronRight, X } from "lucide-react";

// ── types ──────────────────────────────────────────────────────────────────────

interface Slot {
  time: string;
  totalTables: number;
  bookedTables: number;
  available: boolean;
}

// ── week utilities ─────────────────────────────────────────────────────────────

function getWeekDates(anchor: Date): Date[] {
  const monday = new Date(anchor);
  const day = monday.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function toISO(d: Date): string {
  return d.toISOString().split("T")[0];
}

function weekLabel(dates: Date[]): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${fmt(dates[0])} – ${fmt(dates[6])} ${dates[6].getFullYear()}`;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ── pill colour ────────────────────────────────────────────────────────────────

function pillColor(slot: Slot): string {
  if (!slot.available || slot.bookedTables >= slot.totalTables) {
    return "bg-red-500/20 text-red-400 border-red-500/30";
  }
  if (slot.totalTables > 0 && slot.bookedTables / slot.totalTables >= 0.75) {
    return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  }
  return "bg-green-500/20 text-green-400 border-green-500/30";
}

// ── SlotPill ───────────────────────────────────────────────────────────────────

function SlotPill({ slot }: { slot: Slot }) {
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${pillColor(slot)}`}
    >
      {slot.time} · {slot.bookedTables}/{slot.totalTables}
    </span>
  );
}

// ── SlotSidePanel ──────────────────────────────────────────────────────────────

const DEFAULT_SLOT: Slot = { time: "12:00", totalTables: 5, bookedTables: 0, available: true };

function SlotSidePanel({
  date,
  initialSlots,
  onClose,
  onSaved,
}: {
  date: string;
  initialSlots: Slot[];
  onClose: () => void;
  onSaved: (slots: Slot[]) => void;
}) {
  const [editSlots, setEditSlots] = useState<Slot[]>(
    initialSlots.length > 0 ? initialSlots : [{ ...DEFAULT_SLOT }]
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const update = (i: number, field: keyof Slot, value: string | number | boolean) =>
    setEditSlots((p) => p.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));

  const addSlot = () => setEditSlots((p) => [...p, { ...DEFAULT_SLOT }]);

  const removeSlot = (i: number) => setEditSlots((p) => p.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/proxy/restaurant-portal/availability/${date}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots: editSlots }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      onSaved(editSlots);
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const displayDate = new Date(date + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-card border-l border-border shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Editing</p>
            <h2 className="text-base font-semibold">{displayDate}</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {editSlots.map((slot, i) => (
            <div key={i} className="rounded-lg border border-border bg-background p-3 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Time</Label>
                  <Input
                    type="time"
                    value={slot.time}
                    onChange={(e) => update(i, "time", e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Total tables</Label>
                  <Input
                    type="number"
                    min="0"
                    value={slot.totalTables}
                    onChange={(e) => update(i, "totalTables", Number(e.target.value))}
                    className="h-8 w-20 text-sm"
                  />
                </div>
                <button
                  onClick={() => removeSlot(i)}
                  className="mt-5 rounded-md p-1.5 text-red-500 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Booked: {slot.bookedTables}</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={slot.available}
                    onChange={(e) => update(i, "available", e.target.checked)}
                    className="accent-primary"
                  />
                  Available
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border px-5 py-4 space-y-3">
          {saveError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{saveError}</p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={addSlot}>
              <Plus className="h-4 w-4 mr-1" /> Add Slot
            </Button>
            <Button className="flex-1" onClick={save} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── DayCell ────────────────────────────────────────────────────────────────────

const PREVIEW_LIMIT = 3;

function DayCell({
  slots,
  loading,
  error,
  isToday,
  onClick,
}: {
  date: Date;
  slots: Slot[];
  loading: boolean;
  error: boolean;
  isToday: boolean;
  onClick: () => void;
}) {
  const visible = slots.slice(0, PREVIEW_LIMIT);
  const overflow = slots.length - PREVIEW_LIMIT;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className={`flex flex-col gap-1 rounded-lg border p-2 text-left cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/50 min-h-[80px] w-full ${
        isToday ? "border-primary/40 bg-primary/5" : "border-border bg-card"
      }`}
    >
      {loading ? (
        <span className="text-xs text-muted-foreground animate-pulse">Loading…</span>
      ) : error ? (
        <span className="text-xs text-red-400" title="Failed to load">⚠ Error</span>
      ) : slots.length === 0 ? (
        <span className="text-xs text-muted-foreground/50 italic">+ Add slots</span>
      ) : (
        <>
          {visible.map((s, i) => <SlotPill key={i} slot={s} />)}
          {overflow > 0 && (
            <span className="text-xs text-muted-foreground/70 pl-1">+{overflow} more</span>
          )}
        </>
      )}
    </div>
  );
}

// ── WeekGrid ───────────────────────────────────────────────────────────────────

function WeekGrid({
  dates,
  cache,
  loadingDates,
  errorDates,
  onDayClick,
}: {
  dates: Date[];
  cache: Record<string, Slot[]>;
  loadingDates: Set<string>;
  errorDates: Set<string>;
  onDayClick: (iso: string) => void;
}) {
  const todayISO = toISO(new Date());

  return (
    <div className="grid grid-cols-7 gap-2">
      {dates.map((date, i) => {
        const iso = toISO(date);
        return (
          <div key={iso} className="space-y-1">
            <div
              className={`text-center ${iso === todayISO ? "text-primary font-semibold" : "text-muted-foreground"}`}
            >
              <p className="text-xs font-medium">{DAY_NAMES[i]}</p>
              <p className="text-xs">
                {date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </p>
            </div>
            <DayCell
              date={date}
              slots={cache[iso] ?? []}
              loading={loadingDates.has(iso)}
              error={errorDates.has(iso)}
              isToday={iso === todayISO}
              onClick={() => onDayClick(iso)}
            />
          </div>
        );
      })}
    </div>
  );
}

// ── AvailabilityManager ────────────────────────────────────────────────────────

export function AvailabilityManager() {
  const [weekAnchor, setWeekAnchor] = useState<Date>(new Date());
  const [cache, setCache] = useState<Record<string, Slot[]>>({});
  const [loadingDates, setLoadingDates] = useState<Set<string>>(new Set());
  const [errorDates, setErrorDates] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const weekDates = getWeekDates(weekAnchor);

  const fetchWeek = useCallback(async (dates: Date[]) => {
    const toFetch = dates.filter((d) => !(toISO(d) in cache));
    if (toFetch.length === 0) return;

    const isos = toFetch.map(toISO);
    setLoadingDates((prev) => new Set([...prev, ...isos]));

    await Promise.all(
      toFetch.map(async (d) => {
        const iso = toISO(d);
        try {
          const res = await fetch(`/api/proxy/restaurant-portal/availability/${iso}`);
          const slots: Slot[] = res.ok ? (await res.json()) : [];
          setCache((prev) => ({ ...prev, [iso]: slots }));
          setErrorDates((prev) => { const s = new Set(prev); s.delete(iso); return s; });
        } catch {
          setErrorDates((prev) => new Set([...prev, iso]));
          setCache((prev) => ({ ...prev, [iso]: [] }));
        } finally {
          setLoadingDates((prev) => { const s = new Set(prev); s.delete(iso); return s; });
        }
      })
    );
  }, [cache]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchWeek(getWeekDates(weekAnchor));
  }, [weekAnchor]); // eslint-disable-line react-hooks/exhaustive-deps

  const prevWeek = () => {
    const d = new Date(weekAnchor);
    d.setDate(d.getDate() - 7);
    setWeekAnchor(d);
  };

  const nextWeek = () => {
    const d = new Date(weekAnchor);
    d.setDate(d.getDate() + 7);
    setWeekAnchor(d);
  };

  const handleSaved = (iso: string, slots: Slot[]) => {
    setCache((prev) => ({ ...prev, [iso]: slots }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={prevWeek}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium min-w-[200px] text-center">
          {weekLabel(weekDates)}
        </span>
        <Button variant="outline" size="sm" onClick={nextWeek}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <WeekGrid
        dates={weekDates}
        cache={cache}
        loadingDates={loadingDates}
        errorDates={errorDates}
        onDayClick={(iso) => setSelectedDate(iso)}
      />

      {selectedDate && (
        <SlotSidePanel
          date={selectedDate}
          initialSlots={cache[selectedDate] ?? []}
          onClose={() => setSelectedDate(null)}
          onSaved={(slots) => handleSaved(selectedDate, slots)}
        />
      )}
    </div>
  );
}
