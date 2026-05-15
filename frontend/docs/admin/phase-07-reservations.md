# Phase 7: Reservation Monitoring

## Goal
SSR page at `/admin/reservations` showing all system reservations across all restaurants. Filterable by status and date range. Admin can manually update a reservation's status (cancel, mark no-show, mark complete). Uses `PaginationBar` and shared table patterns.

## Architecture
```
/admin/reservations/page.tsx          — SSR, reads searchParams for filters
components/admin/
  ReservationAdminTable.tsx           — CSR table, reuses STATUS_VARIANT pattern
  ReservationStatusButton.tsx         — CSR inline status changer
  DateRangeFilter.tsx                 — CSR date range input (reusable)
```

## shadcn Components to Install

```bash
npx shadcn-ui@latest add popover calendar
```

---

## Files

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/app/admin/reservations/page.tsx` | SSR reservation monitor |
| Create | `src/components/admin/ReservationAdminTable.tsx` | Full reservation table |
| Create | `src/components/admin/ReservationStatusButton.tsx` | CSR status update button |
| Create | `src/components/admin/DateRangeFilter.tsx` | CSR date range URL filter |
| Modify | `src/types/admin.ts` | Add AdminReservation type |

---

## Backend Endpoints Used

| Endpoint | Params | Response |
|----------|--------|----------|
| `GET /api/admin/reservations` | `page`, `limit`, `status`, `from`, `to` | `PaginatedResponse<AdminReservation>` |
| `PATCH /api/admin/reservations/:id` | `{ status: string }` | Updated reservation |

---

## Types (add to `src/types/admin.ts`)

```typescript
export type ReservationStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW";

export interface AdminReservation {
  id: string;
  date: string;
  time: string;
  partySize: number;
  specialRequests: string | null;
  status: ReservationStatus;
  createdAt: string;
  user: { id: string; name: string | null; email: string };
  restaurant: { id: string; name: string; area: string };
  payment: { status: string; amount: number } | null;
}
```

---

## Tasks

### Task 7.1 — ReservationStatusButton component

Create `src/components/admin/ReservationStatusButton.tsx`:

```typescript
"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReservationStatus } from "@/types/admin";

interface ReservationStatusButtonProps {
  reservationId: string;
  currentStatus: ReservationStatus;
}

const TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "NO_SHOW", "CANCELLED"],
  CANCELLED: [],
  COMPLETED: [],
  NO_SHOW: [],
};

const LABELS: Record<ReservationStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  NO_SHOW: "No Show",
};

export function ReservationStatusButton({
  reservationId,
  currentStatus,
}: ReservationStatusButtonProps) {
  const [status, setStatus] = useState<ReservationStatus>(currentStatus);
  const [saving, setSaving] = useState(false);

  const allowed = TRANSITIONS[status];

  if (allowed.length === 0) {
    return (
      <span className="text-sm font-medium text-slate-600">
        {LABELS[status]}
      </span>
    );
  }

  const handleChange = async (newStatus: string) => {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/proxy/admin/reservations/${reservationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      if (res.ok) setStatus(newStatus as ReservationStatus);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Select
      value={status}
      onValueChange={handleChange}
      disabled={saving}
    >
      <SelectTrigger className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={status} disabled>
          {LABELS[status]}
        </SelectItem>
        {allowed.map((s) => (
          <SelectItem key={s} value={s}>
            → {LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

---

### Task 7.2 — DateRangeFilter component

Create `src/components/admin/DateRangeFilter.tsx`:

```typescript
"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateDate = (key: "from" | "to", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="from" className="text-xs text-slate-500">
          From
        </Label>
        <Input
          id="from"
          type="date"
          defaultValue={searchParams.get("from") ?? ""}
          className="w-40"
          onChange={(e) => updateDate("from", e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="to" className="text-xs text-slate-500">
          To
        </Label>
        <Input
          id="to"
          type="date"
          defaultValue={searchParams.get("to") ?? ""}
          className="w-40"
          onChange={(e) => updateDate("to", e.target.value)}
        />
      </div>
    </div>
  );
}
```

---

### Task 7.3 — Reservation status filter (CSR)

Create `src/components/admin/ReservationStatusFilter.tsx`:

```typescript
"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReservationStatusFilterProps {
  currentStatus?: string;
}

export function ReservationStatusFilter({
  currentStatus,
}: ReservationStatusFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("status");
    } else {
      params.set("status", value);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Select
      defaultValue={currentStatus ?? "all"}
      onValueChange={handleChange}
    >
      <SelectTrigger className="w-44">
        <SelectValue placeholder="All statuses" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All statuses</SelectItem>
        <SelectItem value="PENDING">Pending</SelectItem>
        <SelectItem value="CONFIRMED">Confirmed</SelectItem>
        <SelectItem value="COMPLETED">Completed</SelectItem>
        <SelectItem value="CANCELLED">Cancelled</SelectItem>
        <SelectItem value="NO_SHOW">No Show</SelectItem>
      </SelectContent>
    </Select>
  );
}
```

---

### Task 7.4 — ReservationAdminTable component

Create `src/components/admin/ReservationAdminTable.tsx`:

```typescript
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AdminReservation } from "@/types/admin";
import { ReservationStatusButton } from "./ReservationStatusButton";

interface ReservationAdminTableProps {
  reservations: AdminReservation[];
}

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  CONFIRMED: "default",
  PENDING: "secondary",
  CANCELLED: "destructive",
  COMPLETED: "outline",
  NO_SHOW: "destructive",
};

export function ReservationAdminTable({
  reservations,
}: ReservationAdminTableProps) {
  if (reservations.length === 0) {
    return (
      <div className="rounded-lg border bg-white py-16 text-center text-slate-400">
        No reservations found
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead>Guest</TableHead>
            <TableHead>Restaurant</TableHead>
            <TableHead>Date / Time</TableHead>
            <TableHead>Party</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Change Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reservations.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <div className="text-sm font-medium">
                  {r.user.name ?? r.user.email}
                </div>
                <div className="text-xs text-slate-400">{r.user.email}</div>
              </TableCell>
              <TableCell>
                <div className="text-sm font-medium">
                  {r.restaurant.name}
                </div>
                <div className="text-xs text-slate-400">
                  {r.restaurant.area}
                </div>
              </TableCell>
              <TableCell className="text-sm">
                {new Date(r.date).toLocaleDateString("en-LK")}{" "}
                <span className="text-slate-400">{r.time}</span>
              </TableCell>
              <TableCell className="text-sm">{r.partySize}</TableCell>
              <TableCell>
                {r.payment ? (
                  <div className="text-sm">
                    <div className="font-medium">
                      LKR {r.payment.amount.toLocaleString()}
                    </div>
                    <Badge
                      variant={
                        r.payment.status === "SUCCEEDED"
                          ? "default"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {r.payment.status}
                    </Badge>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">Unpaid</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[r.status] ?? "outline"}>
                  {r.status}
                </Badge>
              </TableCell>
              <TableCell>
                <ReservationStatusButton
                  reservationId={r.id}
                  currentStatus={r.status}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

---

### Task 7.5 — Reservations page (SSR)

Create `src/app/admin/reservations/page.tsx`:

```typescript
import { serverFetch } from "@/lib/server/api";
import { PageHeader } from "@/components/admin/PageHeader";
import { ReservationAdminTable } from "@/components/admin/ReservationAdminTable";
import { ReservationStatusFilter } from "@/components/admin/ReservationStatusFilter";
import { DateRangeFilter } from "@/components/admin/DateRangeFilter";
import { PaginationBar } from "@/components/admin/PaginationBar";
import { AdminReservation, PaginatedResponse } from "@/types/admin";

interface SearchParams {
  page?: string;
  status?: string;
  from?: string;
  to?: string;
}

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const page = Number(searchParams.page ?? 1);
  const limit = 25;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(searchParams.status ? { status: searchParams.status } : {}),
    ...(searchParams.from ? { from: searchParams.from } : {}),
    ...(searchParams.to ? { to: searchParams.to } : {}),
  });

  const result = await serverFetch<PaginatedResponse<AdminReservation>>(
    `admin/reservations?${params.toString()}`
  );

  return (
    <div>
      <PageHeader
        title="Reservations"
        description={`${result.total} total reservations`}
      />

      <div className="space-y-4 p-8">
        <div className="flex flex-wrap items-end gap-4">
          <ReservationStatusFilter currentStatus={searchParams.status} />
          <DateRangeFilter />
        </div>

        <ReservationAdminTable reservations={result.data} />
        <PaginationBar page={page} total={result.total} limit={limit} />
      </div>
    </div>
  );
}
```

---

### Commit

```bash
git add src/app/admin/reservations/page.tsx \
        src/components/admin/ReservationAdminTable.tsx \
        src/components/admin/ReservationStatusButton.tsx \
        src/components/admin/ReservationStatusFilter.tsx \
        src/components/admin/DateRangeFilter.tsx
git commit -m "feat(admin): reservation monitoring with status management and date filter"
```
