# Availability Weekly Grid — Design Spec
_Date: 2026-08-02_

## Overview

Replace the current single-date list in `AvailabilityManager.tsx` with a weekly calendar grid. Restaurant admins can see all seven days at a glance, navigate any week, and edit a day's slots in a side panel that slides in on click.

---

## Scope

**In scope**
- Redesign `AvailabilityManager.tsx` (frontend only)
- Split into four sub-components: `WeekGrid`, `DayCell`, `SlotPill`, `SlotSidePanel`
- Week navigation (any past or future week)
- Parallel data fetching for all 7 days per week
- Side panel with full slot editing (add / edit / delete / save)
- Default slot pre-fill when a day has no slots
- Colour-coded pills per availability status
- Sync to backend on save

**Out of scope**
- Backend API changes (existing GET/PUT endpoints are sufficient)
- Bulk edit across multiple days
- Copy slots from one day to another

---

## Layout

### Week Header
```
← Week of 28 Jul – 3 Aug 2026 →
```
- Prev/Next arrows navigate one week at a time
- No restriction on past or future weeks
- "Today" column gets a subtle ring/highlight

### Grid
Seven equal-width columns, one per day (Mon → Sun).

**Column header:** abbreviated day name + date  
```
Mon     Tue     Wed     Thu     Fri     Sat     Sun
28 Jul  29 Jul  30 Jul  31 Jul  1 Aug   2 Aug   3 Aug
```

**Cell body:** vertical stack of `SlotPill` components.  
Empty cells show faint `+ Add slots` text.  
Cells are clickable — click opens the side panel for that day.

---

## SlotPill

Displays one time slot inside a grid cell.

**Label:** `HH:MM · X/Y`  
Example: `12:00 · 3/5`

**Colour rules:**

| Condition | Colour |
|---|---|
| `available = false` OR `booked >= total` | Red |
| `available = true` AND `booked/total >= 0.75` | Amber |
| `available = true` AND `booked/total < 0.75` | Green |

---

## Side Panel

Triggered by clicking any day cell. Slides in from the right.

### Header
- Day name + full date (e.g. "Monday, 28 Jul 2026")
- Close button (✕)

### Body — Slot Cards
One card per slot, each showing:
- **Time** — `<input type="time">` (editable)
- **Total tables** — `<input type="number" min="0">` (editable)
- **Booked** — read-only number (managed by reservation system; not editable by admin)
- **Available** — checkbox toggle
- **Delete** — trash icon button

### Empty Day Default
When a day has no existing slots, the panel pre-populates with one default slot:
```
time: "12:00"   totalTables: 5   bookedTables: 0   available: true
```

### Footer
- `+ Add Slot` — appends a new default slot to the list
- `Save` — writes to backend, updates grid cell, closes panel

### Save behaviour
On Save:
1. `PUT /api/proxy/restaurant-portal/availability/:date` with `{ slots: [...] }`
2. Update local week cache for that date
3. Re-render the grid cell to reflect new pills
4. Close the panel

Unsaved changes are discarded when the panel is closed without saving (no confirmation prompt — keeping it simple).

---

## Data Loading

### Per-week fetch
On every week change (initial load or arrow click):
- Fire 7 parallel `GET /api/proxy/restaurant-portal/availability/:date` requests
- Store results in a `weekCache: Record<string, Slot[]>` map keyed by ISO date string
- Show a loading skeleton in each cell while fetching

### Cache
Loaded weeks are cached in component state. Navigating back to a previously loaded week does not refetch. Saving a day updates only that day's entry in the cache.

---

## Component Structure

All code lives in `AvailabilityManager.tsx`. No new files.

```
AvailabilityManager          root — owns week state, cache, side-panel state
  WeekGrid                   renders header + 7 DayCell columns
    DayCell                  receives slots[], handles click
      SlotPill               coloured pill, display only
  SlotSidePanel              slide-in panel, owns local editable-slots state
```

### State owned by `AvailabilityManager`
| State | Type | Purpose |
|---|---|---|
| `weekStart` | `Date` | Monday of currently displayed week |
| `weekCache` | `Record<string, Slot[]>` | Fetched slots per ISO date |
| `loadingDates` | `Set<string>` | Dates currently fetching |
| `selectedDate` | `string \| null` | Date whose panel is open |

### State owned by `SlotSidePanel`
| State | Type | Purpose |
|---|---|---|
| `editSlots` | `Slot[]` | Local copy of slots being edited |
| `saving` | `boolean` | Save-in-progress flag |

---

## Interface Types

```ts
interface Slot {
  time: string;
  totalTables: number;
  bookedTables: number;
  available: boolean;
}
```

Matches the existing backend `AvailabilitySlot` interface — no changes needed.

---

## API Endpoints (unchanged)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/proxy/restaurant-portal/availability/:date` | Fetch slots for one date |
| PUT | `/api/proxy/restaurant-portal/availability/:date` | Save slots for one date |

`:date` is an ISO date string — `YYYY-MM-DD`.

---

## Error Handling

- Fetch failure: cell shows a red `!` indicator; hovering shows "Failed to load"
- Save failure: inline error message at the bottom of the side panel; panel stays open
- No loading spinners that block interaction with other days

---

## Non-Goals

- No drag-to-copy slots between days
- No recurring weekly templates
- No bulk-save across multiple days
