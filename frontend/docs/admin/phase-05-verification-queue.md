# Phase 5: Verification Queue

## Goal
Dedicated page at `/admin/verification` for the restaurant verification workflow. SSR renders a queue of all unverified restaurants. Each row has an "Approve" and "Reject" action. Clicking either opens a confirmation dialog (CSR), performs the action via proxy, and removes the item from the queue optimistically.

## Architecture
```
/admin/verification/page.tsx        — SSR, fetches unverified restaurants
components/admin/
  VerificationQueue.tsx             — CSR queue list with Approve/Reject buttons
  VerificationActionDialog.tsx      — CSR confirm dialog before action
```

## shadcn Components to Install

```bash
npx shadcn-ui@latest add dialog alert-dialog
```

---

## Files

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/app/admin/verification/page.tsx` | SSR, fetches unverified list |
| Create | `src/components/admin/VerificationQueue.tsx` | CSR queue table |
| Create | `src/components/admin/VerificationActionDialog.tsx` | CSR confirmation dialog |

---

## Backend Endpoints Used

| Endpoint | Method | Body | Description |
|----------|--------|------|-------------|
| `GET /api/admin/restaurants?verified=false` | GET | — | All unverified restaurants |
| `POST /api/admin/restaurants/:id/verify` | POST | — | Mark verified |
| `PATCH /api/admin/restaurants/:id` | PATCH | `{ isActive: false }` | Reject = disable |

---

## Types (add to `src/types/admin.ts`)

```typescript
export type VerificationAction = "approve" | "reject";
```

---

## Tasks

### Task 5.1 — VerificationActionDialog component

Create `src/components/admin/VerificationActionDialog.tsx`:

```typescript
"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { VerificationAction } from "@/types/admin";

interface VerificationActionDialogProps {
  open: boolean;
  action: VerificationAction | null;
  restaurantName: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function VerificationActionDialog({
  open,
  action,
  restaurantName,
  onConfirm,
  onCancel,
}: VerificationActionDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {action === "approve"
              ? "Approve Restaurant?"
              : "Reject Restaurant?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {action === "approve"
              ? `"${restaurantName}" will be marked as verified and visible to all users.`
              : `"${restaurantName}" will be disabled and the owner will need to resubmit.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={
              action === "reject"
                ? "bg-red-600 hover:bg-red-700"
                : undefined
            }
          >
            {action === "approve" ? "Approve" : "Reject"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

---

### Task 5.2 — VerificationQueue component

Create `src/components/admin/VerificationQueue.tsx`:

```typescript
"use client";

import { useState } from "react";
import { AdminRestaurant, VerificationAction } from "@/types/admin";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VerificationActionDialog } from "./VerificationActionDialog";
import Link from "next/link";
import { Eye, CheckCircle2, XCircle } from "lucide-react";

interface VerificationQueueProps {
  restaurants: AdminRestaurant[];
}

interface Pending {
  id: string;
  name: string;
  action: VerificationAction;
}

export function VerificationQueue({
  restaurants,
}: VerificationQueueProps) {
  const [queue, setQueue] = useState(restaurants);
  const [pending, setPending] = useState<Pending | null>(null);
  const [processing, setProcessing] = useState(false);

  const openDialog = (
    id: string,
    name: string,
    action: VerificationAction
  ) => {
    setPending({ id, name, action });
  };

  const handleConfirm = async () => {
    if (!pending) return;
    setProcessing(true);

    try {
      if (pending.action === "approve") {
        await fetch(`/api/proxy/admin/restaurants/${pending.id}/verify`, {
          method: "POST",
        });
      } else {
        await fetch(`/api/proxy/admin/restaurants/${pending.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: false }),
        });
      }
      // Remove from queue optimistically
      setQueue((prev) => prev.filter((r) => r.id !== pending.id));
    } finally {
      setProcessing(false);
      setPending(null);
    }
  };

  if (queue.length === 0) {
    return (
      <div className="rounded-lg border bg-white py-20 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-500" />
        <p className="text-lg font-medium text-slate-700">All caught up!</p>
        <p className="text-sm text-slate-400">
          No restaurants awaiting verification.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Restaurant</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Area</TableHead>
              <TableHead>Cuisines</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {queue.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="font-medium">{r.name}</div>
                </TableCell>
                <TableCell className="text-sm text-slate-500">
                  {r.admin.email}
                </TableCell>
                <TableCell className="text-sm">{r.area}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {r.cuisineTypes.slice(0, 2).map((c) => (
                      <Badge key={c} variant="secondary" className="text-xs">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{r.priceRange}</Badge>
                </TableCell>
                <TableCell className="text-sm text-slate-400">
                  {new Date(r.createdAt).toLocaleDateString("en-LK")}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Link href={`/admin/restaurants/${r.id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-green-300 text-green-700 hover:bg-green-50"
                      onClick={() => openDialog(r.id, r.name, "approve")}
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => openDialog(r.id, r.name, "reject")}
                    >
                      <XCircle className="mr-1 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <VerificationActionDialog
        open={pending !== null}
        action={pending?.action ?? null}
        restaurantName={pending?.name ?? ""}
        onConfirm={handleConfirm}
        onCancel={() => setPending(null)}
      />
    </>
  );
}
```

---

### Task 5.3 — Verification queue page (SSR)

Create `src/app/admin/verification/page.tsx`:

```typescript
import { serverFetch } from "@/lib/server/api";
import { PageHeader } from "@/components/admin/PageHeader";
import { VerificationQueue } from "@/components/admin/VerificationQueue";
import { AdminRestaurant, PaginatedResponse } from "@/types/admin";

export default async function VerificationPage() {
  const result = await serverFetch<PaginatedResponse<AdminRestaurant>>(
    "admin/restaurants?verified=false&limit=100"
  );

  return (
    <div>
      <PageHeader
        title="Verification Queue"
        description={
          result.total > 0
            ? `${result.total} restaurant${result.total > 1 ? "s" : ""} awaiting review`
            : "No restaurants awaiting verification"
        }
      />

      <div className="p-8">
        <VerificationQueue restaurants={result.data} />
      </div>
    </div>
  );
}
```

---

### Task 5.4 — Update dashboard alert link

The `DashboardAlerts` component already links to `/admin/verification`. Confirm it works end-to-end: dashboard alert banner → verification queue page → approve/reject action → item removed from list.

---

### Commit

```bash
git add src/app/admin/verification/page.tsx \
        src/components/admin/VerificationQueue.tsx \
        src/components/admin/VerificationActionDialog.tsx
git commit -m "feat(admin): verification queue with approve/reject workflow"
```
