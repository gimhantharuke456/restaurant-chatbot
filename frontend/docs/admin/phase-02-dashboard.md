# Phase 2: Dashboard Overview Page

## Goal
Build the admin landing page at `/admin`. Fetches KPI stats server-side (SSR), renders stat cards, recent reservations summary, and a pending-verification alert banner. All data fetching happens in the Server Component; cards are CSR for future interactivity.

## Architecture
```
/admin/page.tsx           — async Server Component, fetches stats + recent items
components/admin/
  StatCard.tsx            — CSR stat card (reused across dashboard)
  StatGrid.tsx            — Grid wrapper (CSR, handles loading skeleton)
  DashboardAlerts.tsx     — CSR: shows urgent action banners
  RecentReservations.tsx  — CSR: last 5 reservations table
```

## shadcn Components to Install

```bash
npx shadcn-ui@latest add card badge skeleton table alert
```

---

## Files

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/app/admin/page.tsx` | SSR — fetches stats + recent data |
| Create | `src/components/admin/StatCard.tsx` | Single KPI card |
| Create | `src/components/admin/StatGrid.tsx` | 6-column responsive stat grid |
| Create | `src/components/admin/DashboardAlerts.tsx` | Alert banners for pending actions |
| Create | `src/components/admin/RecentReservations.tsx` | Last 5 reservations mini-table |

---

## Backend Endpoints Used

| Endpoint | Response |
|----------|----------|
| `GET /api/admin/stats` | `{ totalUsers, totalRestaurants, activeReservations, totalRevenue, totalPayments, verificationPending }` |
| `GET /api/admin/reservations?limit=5&sort=recent` | Array of recent reservations |

---

## Tasks

### Task 2.1 — StatCard component

Create `src/components/admin/StatCard.tsx`:

```typescript
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: string; up: boolean };
  accent?: "default" | "green" | "orange" | "red" | "blue";
}

const ACCENT_CLASSES = {
  default: "bg-slate-100 text-slate-600",
  green:   "bg-green-100 text-green-700",
  orange:  "bg-orange-100 text-orange-700",
  red:     "bg-red-100 text-red-700",
  blue:    "bg-blue-100 text-blue-700",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  accent = "default",
}: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between p-6">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          {trend && (
            <p
              className={cn(
                "text-xs font-medium",
                trend.up ? "text-green-600" : "text-red-600"
              )}
            >
              {trend.up ? "↑" : "↓"} {trend.value}
            </p>
          )}
        </div>
        <div className={cn("rounded-lg p-3", ACCENT_CLASSES[accent])}>
          <Icon className="h-6 w-6" />
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### Task 2.2 — StatGrid component

Create `src/components/admin/StatGrid.tsx`:

```typescript
import { ReactNode } from "react";

interface StatGridProps {
  children: ReactNode;
}

export function StatGrid({ children }: StatGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {children}
    </div>
  );
}
```

---

### Task 2.3 — DashboardAlerts component

Create `src/components/admin/DashboardAlerts.tsx`:

```typescript
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

interface DashboardAlertsProps {
  verificationPending: number;
}

export function DashboardAlerts({ verificationPending }: DashboardAlertsProps) {
  if (verificationPending === 0) return null;

  return (
    <Alert className="border-orange-200 bg-orange-50">
      <AlertCircle className="h-4 w-4 text-orange-600" />
      <AlertTitle className="text-orange-800">Action Required</AlertTitle>
      <AlertDescription className="text-orange-700">
        {verificationPending} restaurant{verificationPending > 1 ? "s are" : " is"} pending
        verification.{" "}
        <Link href="/admin/verification" className="underline font-medium">
          Review now →
        </Link>
      </AlertDescription>
    </Alert>
  );
}
```

---

### Task 2.4 — RecentReservations component

Create `src/components/admin/RecentReservations.tsx`:

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

interface Reservation {
  id: string;
  user: { name: string | null; email: string };
  restaurant: { name: string };
  date: string;
  time: string;
  partySize: number;
  status: string;
}

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  CONFIRMED: "default",
  PENDING: "secondary",
  CANCELLED: "destructive",
  COMPLETED: "outline",
};

interface RecentReservationsProps {
  reservations: Reservation[];
}

export function RecentReservations({ reservations }: RecentReservationsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">
          Recent Reservations
        </CardTitle>
        <Link
          href="/admin/reservations"
          className="text-sm text-blue-600 hover:underline"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Guest</TableHead>
              <TableHead>Restaurant</TableHead>
              <TableHead>Date / Time</TableHead>
              <TableHead>Party</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reservations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-400">
                  No reservations yet
                </TableCell>
              </TableRow>
            ) : (
              reservations.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="text-sm font-medium">
                      {r.user.name ?? r.user.email}
                    </div>
                    <div className="text-xs text-slate-400">{r.user.email}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.restaurant.name}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(r.date).toLocaleDateString("en-LK")}{" "}
                    <span className="text-slate-400">{r.time}</span>
                  </TableCell>
                  <TableCell className="text-sm">{r.partySize}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[r.status] ?? "outline"}>
                      {r.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
```

---

### Task 2.5 — Admin dashboard page (SSR)

Create `src/app/admin/page.tsx`:

```typescript
import { serverFetch } from "@/lib/server/api";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { StatGrid } from "@/components/admin/StatGrid";
import { DashboardAlerts } from "@/components/admin/DashboardAlerts";
import { RecentReservations } from "@/components/admin/RecentReservations";
import {
  Users,
  Building2,
  CalendarDays,
  CreditCard,
  DollarSign,
  AlertCircle,
} from "lucide-react";

interface AdminStats {
  totalUsers: number;
  totalRestaurants: number;
  activeReservations: number;
  totalRevenue: number;
  totalPayments: number;
  verificationPending: number;
}

interface RecentReservation {
  id: string;
  user: { name: string | null; email: string };
  restaurant: { name: string };
  date: string;
  time: string;
  partySize: number;
  status: string;
}

export default async function AdminDashboardPage() {
  const [stats, recentRes] = await Promise.all([
    serverFetch<AdminStats>("admin/stats"),
    serverFetch<RecentReservation[]>("admin/reservations?limit=5&sort=recent").catch(
      () => []
    ),
  ]);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="System overview for Restaurant Chatbot"
      />

      <div className="space-y-6 p-8">
        <DashboardAlerts verificationPending={stats.verificationPending} />

        <StatGrid>
          <StatCard
            label="Total Users"
            value={stats.totalUsers.toLocaleString()}
            icon={Users}
            accent="blue"
          />
          <StatCard
            label="Total Restaurants"
            value={stats.totalRestaurants.toLocaleString()}
            icon={Building2}
          />
          <StatCard
            label="Active Reservations"
            value={stats.activeReservations.toLocaleString()}
            icon={CalendarDays}
            accent="green"
          />
          <StatCard
            label="Total Revenue"
            value={`LKR ${stats.totalRevenue.toLocaleString()}`}
            icon={DollarSign}
            accent="green"
          />
          <StatCard
            label="Total Payments"
            value={stats.totalPayments.toLocaleString()}
            icon={CreditCard}
          />
          <StatCard
            label="Pending Verification"
            value={stats.verificationPending}
            icon={AlertCircle}
            accent={stats.verificationPending > 0 ? "orange" : "default"}
          />
        </StatGrid>

        <RecentReservations reservations={recentRes} />
      </div>
    </div>
  );
}
```

---

### Commit

```bash
git add src/app/admin/page.tsx src/components/admin/StatCard.tsx \
        src/components/admin/StatGrid.tsx src/components/admin/DashboardAlerts.tsx \
        src/components/admin/RecentReservations.tsx
git commit -m "feat(admin): dashboard page with KPI stats and recent reservations"
```
