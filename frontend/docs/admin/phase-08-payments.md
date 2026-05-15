# Phase 8: Payments & Revenue

## Goal
SSR page at `/admin/payments` showing all payment records with amounts, Stripe IDs, and statuses. Admins can view the Stripe receipt URL and trigger a refund. Summary stats (total revenue, succeeded, failed) shown at the top as stat cards (reusing `StatCard`).

## Architecture
```
/admin/payments/page.tsx              — SSR, fetches payments + summary stats
components/admin/
  PaymentTable.tsx                    — CSR table with refund button
  RefundButton.tsx                    — CSR refund action with confirmation
  PaymentSummary.tsx                  — Reuses StatCard for revenue overview
```

## shadcn Components to Install

All needed shadcn components are already installed from previous phases.

---

## Files

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/app/admin/payments/page.tsx` | SSR payments page |
| Create | `src/components/admin/PaymentTable.tsx` | Payment list with refund |
| Create | `src/components/admin/RefundButton.tsx` | CSR confirm + refund |
| Create | `src/components/admin/PaymentSummary.tsx` | Revenue stat cards |
| Modify | `src/types/admin.ts` | Add AdminPayment type |

---

## Backend Endpoints Used

| Endpoint | Params | Response |
|----------|--------|----------|
| `GET /api/admin/payments` | `page`, `limit`, `status` | `PaginatedResponse<AdminPayment>` |
| `GET /api/admin/payments/summary` | — | `{ totalRevenue, succeeded, failed, refunded }` |
| `POST /api/admin/payments/:id/refund` | — | Updated payment |

---

## Types (add to `src/types/admin.ts`)

```typescript
export type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";

export interface AdminPayment {
  id: string;
  amount: number;
  currency: string;
  stripePaymentId: string | null;
  receiptUrl: string | null;
  status: PaymentStatus;
  createdAt: string;
  user: { name: string | null; email: string };
  reservation: {
    id: string;
    date: string;
    time: string;
    restaurant: { name: string };
  };
}

export interface PaymentSummaryStats {
  totalRevenue: number;
  succeeded: number;
  failed: number;
  refunded: number;
}
```

---

## Tasks

### Task 8.1 — RefundButton component

Create `src/components/admin/RefundButton.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { PaymentStatus } from "@/types/admin";
import { RotateCcw } from "lucide-react";

interface RefundButtonProps {
  paymentId: string;
  amount: number;
  currency: string;
  initialStatus: PaymentStatus;
}

export function RefundButton({
  paymentId,
  amount,
  currency,
  initialStatus,
}: RefundButtonProps) {
  const [status, setStatus] = useState<PaymentStatus>(initialStatus);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (status !== "SUCCEEDED") {
    return (
      <span className="text-xs text-slate-400">
        {status === "REFUNDED" ? "Refunded" : "—"}
      </span>
    );
  }

  const handleRefund = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/proxy/admin/payments/${paymentId}/refund`,
        { method: "POST" }
      );
      if (res.ok) setStatus("REFUNDED");
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-red-600 hover:bg-red-50 hover:text-red-700"
        onClick={() => setOpen(true)}
      >
        <RotateCcw className="mr-1 h-3 w-3" />
        Refund
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Issue Refund?</AlertDialogTitle>
            <AlertDialogDescription>
              This will refund{" "}
              <strong>
                {currency} {amount.toLocaleString()}
              </strong>{" "}
              via Stripe. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRefund}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? "Refunding…" : "Issue Refund"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

---

### Task 8.2 — PaymentSummary component

Create `src/components/admin/PaymentSummary.tsx`:

```typescript
import { StatCard } from "./StatCard";
import { StatGrid } from "./StatGrid";
import { PaymentSummaryStats } from "@/types/admin";
import { DollarSign, CheckCircle2, XCircle, RotateCcw } from "lucide-react";

interface PaymentSummaryProps {
  stats: PaymentSummaryStats;
}

export function PaymentSummary({ stats }: PaymentSummaryProps) {
  return (
    <StatGrid>
      <StatCard
        label="Total Revenue"
        value={`LKR ${stats.totalRevenue.toLocaleString()}`}
        icon={DollarSign}
        accent="green"
      />
      <StatCard
        label="Succeeded Payments"
        value={stats.succeeded}
        icon={CheckCircle2}
        accent="green"
      />
      <StatCard
        label="Failed Payments"
        value={stats.failed}
        icon={XCircle}
        accent={stats.failed > 0 ? "red" : "default"}
      />
      <StatCard
        label="Refunded"
        value={stats.refunded}
        icon={RotateCcw}
        accent="orange"
      />
    </StatGrid>
  );
}
```

---

### Task 8.3 — PaymentStatusFilter (CSR)

Create `src/components/admin/PaymentStatusFilter.tsx`:

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

export function PaymentStatusFilter({
  currentStatus,
}: {
  currentStatus?: string;
}) {
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
        <SelectItem value="all">All payments</SelectItem>
        <SelectItem value="SUCCEEDED">Succeeded</SelectItem>
        <SelectItem value="PENDING">Pending</SelectItem>
        <SelectItem value="FAILED">Failed</SelectItem>
        <SelectItem value="REFUNDED">Refunded</SelectItem>
      </SelectContent>
    </Select>
  );
}
```

---

### Task 8.4 — PaymentTable component

Create `src/components/admin/PaymentTable.tsx`:

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
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { AdminPayment } from "@/types/admin";
import { RefundButton } from "./RefundButton";

interface PaymentTableProps {
  payments: AdminPayment[];
}

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  SUCCEEDED: "default",
  PENDING: "secondary",
  FAILED: "destructive",
  REFUNDED: "outline",
};

export function PaymentTable({ payments }: PaymentTableProps) {
  if (payments.length === 0) {
    return (
      <div className="rounded-lg border bg-white py-16 text-center text-slate-400">
        No payments found
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead>User</TableHead>
            <TableHead>Restaurant</TableHead>
            <TableHead>Reservation</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Stripe ID</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                <div className="text-sm font-medium">
                  {p.user.name ?? p.user.email}
                </div>
                <div className="text-xs text-slate-400">{p.user.email}</div>
              </TableCell>
              <TableCell className="text-sm">
                {p.reservation.restaurant.name}
              </TableCell>
              <TableCell className="text-sm text-slate-500">
                {new Date(p.reservation.date).toLocaleDateString("en-LK")}{" "}
                {p.reservation.time}
              </TableCell>
              <TableCell className="font-medium">
                {p.currency} {p.amount.toLocaleString()}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[p.status] ?? "outline"}>
                  {p.status}
                </Badge>
              </TableCell>
              <TableCell>
                {p.stripePaymentId ? (
                  <code className="rounded bg-slate-100 px-1 text-xs">
                    {p.stripePaymentId.slice(0, 14)}…
                  </code>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </TableCell>
              <TableCell className="text-sm text-slate-400">
                {new Date(p.createdAt).toLocaleDateString("en-LK")}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {p.receiptUrl && (
                    <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                  <RefundButton
                    paymentId={p.id}
                    amount={p.amount}
                    currency={p.currency}
                    initialStatus={p.status}
                  />
                </div>
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

### Task 8.5 — Payments page (SSR)

Create `src/app/admin/payments/page.tsx`:

```typescript
import { serverFetch } from "@/lib/server/api";
import { PageHeader } from "@/components/admin/PageHeader";
import { PaymentTable } from "@/components/admin/PaymentTable";
import { PaymentSummary } from "@/components/admin/PaymentSummary";
import { PaymentStatusFilter } from "@/components/admin/PaymentStatusFilter";
import { PaginationBar } from "@/components/admin/PaginationBar";
import {
  AdminPayment,
  PaginatedResponse,
  PaymentSummaryStats,
} from "@/types/admin";

interface SearchParams {
  page?: string;
  status?: string;
}

export default async function PaymentsPage({
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
  });

  const [result, summary] = await Promise.all([
    serverFetch<PaginatedResponse<AdminPayment>>(
      `admin/payments?${params.toString()}`
    ),
    serverFetch<PaymentSummaryStats>("admin/payments/summary"),
  ]);

  return (
    <div>
      <PageHeader
        title="Payments"
        description={`${result.total} payment records`}
      />

      <div className="space-y-6 p-8">
        <PaymentSummary stats={summary} />

        <div className="flex items-center gap-3">
          <PaymentStatusFilter currentStatus={searchParams.status} />
        </div>

        <PaymentTable payments={result.data} />
        <PaginationBar page={page} total={result.total} limit={limit} />
      </div>
    </div>
  );
}
```

---

### Commit

```bash
git add src/app/admin/payments/page.tsx \
        src/components/admin/PaymentTable.tsx \
        src/components/admin/RefundButton.tsx \
        src/components/admin/PaymentSummary.tsx \
        src/components/admin/PaymentStatusFilter.tsx
git commit -m "feat(admin): payments page with refund action and revenue summary"
```
