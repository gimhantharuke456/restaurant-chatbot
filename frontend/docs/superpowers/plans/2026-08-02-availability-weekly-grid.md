# Availability Weekly Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-date slot list in `AvailabilityManager.tsx` with a weekly calendar grid — 7 clickable day columns, colour-coded slot pills, and a slide-in side panel for editing.

**Architecture:** All logic lives in one file (`AvailabilityManager.tsx`), composed of four internal components (`WeekGrid`, `DayCell`, `SlotPill`, `SlotSidePanel`). The root `AvailabilityManager` owns week navigation state, a per-date slot cache, and which date's panel is open. When a week loads, 7 parallel GETs populate the cache; saving a day runs a PUT and updates only that date's cache entry.

**Tech Stack:** Next.js 16 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui (`Button`, `Input`, `Label`, `Switch`, `Skeleton`), lucide-react icons. Existing backend endpoints unchanged.

## Global Constraints

- All code in `frontend/src/components/restaurant-portal/AvailabilityManager.tsx` — no new files
- No `npm test`, no `tsc --noEmit` — verify correctness in browser
- API base path: `/api/proxy/restaurant-portal/availability/:date` (date = `YYYY-MM-DD`)
- `Slot` type must match backend: `{ time: string; totalTables: number; bookedTables: number; available: boolean }`
- No backend changes

---

### Task 1: Types, week-utility functions, and SlotPill

**Files:**
- Modify: `frontend/src/components/restaurant-portal/AvailabilityManager.tsx` (full rewrite)

**Interfaces:**
- Produces:
  - `Slot` interface
  - `getWeekDates(anchor: Date): Date[]` — returns array of 7 `Date` objects Mon–Sun
  - `toISO(d: Date): string` — returns `YYYY-MM-DD`
  - `weekLabel(dates: Date[]): string` — e.g. `"28 Jul – 3 Aug 2026"`
  - `pillColor(slot: Slot): string` — Tailwind class string
  - `SlotPill` component — props: `slot: Slot`

- [ ] **Step 1: Replace the file with scaffolding + types**

Paste the following as the new full contents of `AvailabilityManager.tsx`:

```tsx
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
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
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
  if (slot.bookedTables / slot.totalTables >= 0.75) {
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

// ── placeholder exports so the file compiles ───────────────────────────────────

export function AvailabilityManager() {
  return <div className="p-4 text-muted-foreground text-sm">Building…</div>;
}
```

- [ ] **Step 2: Open the browser at `/restaurant/availability` and confirm the page renders "Building…" without a console error**

---

### Task 2: SlotSidePanel

**Files:**
- Modify: `frontend/src/components/restaurant-portal/AvailabilityManager.tsx`

**Interfaces:**
- Consumes: `Slot`, `pillColor`
- Produces:
  - `SlotSidePanel` component
  - Props: `date: string; initialSlots: Slot[]; onClose: () => void; onSaved: (slots: Slot[]) => void`

- [ ] **Step 1: Add `SlotSidePanel` above the `AvailabilityManager` export**

Insert this block between the `SlotPill` function and the `AvailabilityManager` export:

```tsx
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
      {/* backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      {/* panel */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-card border-l border-border shadow-xl">
        {/* header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Editing</p>
            <h2 className="text-base font-semibold">{displayDate}</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* slot list */}
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

        {/* footer */}
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
```

- [ ] **Step 2: Verify the file still compiles in browser — `/restaurant/availability` should still show "Building…" with no console errors**

---

### Task 3: DayCell and WeekGrid

**Files:**
- Modify: `frontend/src/components/restaurant-portal/AvailabilityManager.tsx`

**Interfaces:**
- Consumes: `Slot`, `SlotPill`, `toISO`, `DAY_NAMES`
- Produces:
  - `DayCell` — props: `date: Date; slots: Slot[]; loading: boolean; error: boolean; isToday: boolean; onClick: () => void`
  - `WeekGrid` — props: `dates: Date[]; cache: Record<string, Slot[]>; loadingDates: Set<string>; errorDates: Set<string>; onDayClick: (iso: string) => void`

- [ ] **Step 1: Add `DayCell` and `WeekGrid` above the `AvailabilityManager` export**

Insert between `SlotSidePanel` and `AvailabilityManager`:

```tsx
// ── DayCell ────────────────────────────────────────────────────────────────────

function DayCell({
  date,
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
  return (
    <button
      onClick={onClick}
      className={`flex flex-col gap-1 rounded-lg border p-2 text-left transition-colors hover:border-primary/50 hover:bg-muted/50 min-h-[80px] w-full ${
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
        slots.map((s, i) => <SlotPill key={i} slot={s} />)
      )}
    </button>
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
            {/* column header */}
            <div className={`text-center ${toISO(date) === todayISO ? "text-primary font-semibold" : "text-muted-foreground"}`}>
              <p className="text-xs font-medium">{DAY_NAMES[i]}</p>
              <p className="text-xs">
                {date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </p>
            </div>
            {/* cell */}
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
```

- [ ] **Step 2: Verify the file still compiles — no console errors at `/restaurant/availability`**

---

### Task 4: AvailabilityManager root — wire everything together

**Files:**
- Modify: `frontend/src/components/restaurant-portal/AvailabilityManager.tsx`

**Interfaces:**
- Consumes: `getWeekDates`, `toISO`, `weekLabel`, `WeekGrid`, `SlotSidePanel`, `Slot`
- Produces: complete `AvailabilityManager` export

- [ ] **Step 1: Replace the placeholder `AvailabilityManager` export with the real implementation**

Replace:
```tsx
export function AvailabilityManager() {
  return <div className="p-4 text-muted-foreground text-sm">Building…</div>;
}
```

With:
```tsx
export function AvailabilityManager() {
  const [weekAnchor, setWeekAnchor] = useState<Date>(new Date());
  const [cache, setCache] = useState<Record<string, Slot[]>>({});
  const [loadingDates, setLoadingDates] = useState<Set<string>>(new Set());
  const [errorDates, setErrorDates] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const weekDates = getWeekDates(weekAnchor);

  const fetchWeek = useCallback(
    async (dates: Date[]) => {
      const toFetch = dates.filter((d) => !(toISO(d) in cache));
      if (toFetch.length === 0) return;

      const isos = toFetch.map(toISO);
      setLoadingDates((prev) => new Set([...prev, ...isos]));

      await Promise.all(
        toFetch.map(async (d) => {
          const iso = toISO(d);
          try {
            const res = await fetch(`/api/proxy/restaurant-portal/availability/${iso}`);
            const slots: Slot[] = res.ok ? await res.json() : [];
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
    },
    [cache]
  );

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
      {/* week navigation */}
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

      {/* grid */}
      <WeekGrid
        dates={weekDates}
        cache={cache}
        loadingDates={loadingDates}
        errorDates={errorDates}
        onDayClick={(iso) => setSelectedDate(iso)}
      />

      {/* side panel */}
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
```

- [ ] **Step 2: Open `/restaurant/availability` in the browser — verify the 7-column week grid renders with day headers and the current week label**

- [ ] **Step 3: Navigate prev/next week — confirm the label updates and new days load**

- [ ] **Step 4: Click any day cell — confirm the side panel slides in with the correct date header**

- [ ] **Step 5: On an empty day, confirm the panel pre-fills one slot (12:00 · 5 tables)**

- [ ] **Step 6: Add a slot, change the time, save — confirm the pill appears in the grid cell immediately**

- [ ] **Step 7: Click the saved day again — confirm the panel reopens with the saved slots**

- [ ] **Step 8: Toggle "Available" off and save — confirm the pill turns red in the grid**

- [ ] **Step 9: Click the backdrop (dark overlay) — confirm the panel closes without saving**

- [ ] **Step 10: Navigate away and back to the same week — confirm already-loaded days do not refetch (no network requests in DevTools)**

---

## Final file structure

Everything lives in:
```
frontend/src/components/restaurant-portal/AvailabilityManager.tsx
```

Internal order of declarations:
1. Imports
2. `Slot` interface
3. Week utilities (`getWeekDates`, `toISO`, `weekLabel`, `DAY_NAMES`)
4. `pillColor`
5. `SlotPill`
6. `SlotSidePanel`
7. `DayCell`
8. `WeekGrid`
9. `AvailabilityManager` (exported root)
