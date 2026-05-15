# Phase 9: Analytics & Reporting

## Goal
SSR page at `/admin/analytics` that fetches time-series and aggregated data server-side, then renders interactive charts (CSR) using Recharts. Charts: reservations over time (line), revenue over time (area), cuisines by popularity (bar), user signups over time (line), reservation status breakdown (pie).

## Architecture
```
/admin/analytics/page.tsx                 — SSR, fetches all analytics data
components/admin/analytics/
  ReservationsTrendChart.tsx              — CSR Recharts line chart
  RevenueTrendChart.tsx                   — CSR Recharts area chart
  CuisinePopularityChart.tsx              — CSR Recharts bar chart
  UserGrowthChart.tsx                     — CSR Recharts line chart
  ReservationStatusPieChart.tsx           — CSR Recharts pie chart
  ChartCard.tsx                           — Reusable chart wrapper with title
```

## Dependencies to Install

```bash
npm install recharts
```

## shadcn Components to Install

```bash
npx shadcn-ui@latest add card
# Already installed
```

---

## Files

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/app/admin/analytics/page.tsx` | SSR, fetches analytics endpoints |
| Create | `src/components/admin/analytics/ChartCard.tsx` | Reusable chart wrapper |
| Create | `src/components/admin/analytics/ReservationsTrendChart.tsx` | Line chart |
| Create | `src/components/admin/analytics/RevenueTrendChart.tsx` | Area chart |
| Create | `src/components/admin/analytics/CuisinePopularityChart.tsx` | Bar chart |
| Create | `src/components/admin/analytics/UserGrowthChart.tsx` | Line chart |
| Create | `src/components/admin/analytics/ReservationStatusPieChart.tsx` | Pie chart |
| Modify | `src/types/admin.ts` | Add analytics data types |

---

## Backend Endpoints Used

| Endpoint | Response |
|----------|----------|
| `GET /api/admin/analytics/reservations` | `Array<{ date: string, count: number }>` |
| `GET /api/admin/analytics/revenue` | `Array<{ date: string, amount: number }>` |
| `GET /api/admin/analytics/cuisines` | `Array<{ cuisine: string, count: number }>` |
| `GET /api/admin/analytics/users` | `Array<{ date: string, count: number }>` |
| `GET /api/admin/analytics/reservation-status` | `Array<{ status: string, count: number }>` |

---

## Types (add to `src/types/admin.ts`)

```typescript
export interface TimeSeriesPoint {
  date: string;
  count?: number;
  amount?: number;
}

export interface CuisinePoint {
  cuisine: string;
  count: number;
}

export interface StatusPoint {
  status: string;
  count: number;
}

export interface AnalyticsData {
  reservationsTrend: TimeSeriesPoint[];
  revenueTrend: TimeSeriesPoint[];
  cuisinePopularity: CuisinePoint[];
  userGrowth: TimeSeriesPoint[];
  reservationStatus: StatusPoint[];
}
```

---

## Tasks

### Task 9.1 — ChartCard component

Create `src/components/admin/analytics/ChartCard.tsx`:

```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function ChartCard({ title, description, children }: ChartCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {description && (
          <p className="text-xs text-slate-400">{description}</p>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
```

---

### Task 9.2 — ReservationsTrendChart component

Create `src/components/admin/analytics/ReservationsTrendChart.tsx`:

```typescript
"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TimeSeriesPoint } from "@/types/admin";

interface ReservationsTrendChartProps {
  data: TimeSeriesPoint[];
}

export function ReservationsTrendChart({
  data,
}: ReservationsTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          tickFormatter={(v) =>
            new Date(v).toLocaleDateString("en-LK", {
              month: "short",
              day: "numeric",
            })
          }
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          labelFormatter={(v) => new Date(v).toLocaleDateString("en-LK")}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          name="Reservations"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

---

### Task 9.3 — RevenueTrendChart component

Create `src/components/admin/analytics/RevenueTrendChart.tsx`:

```typescript
"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TimeSeriesPoint } from "@/types/admin";

interface RevenueTrendChartProps {
  data: TimeSeriesPoint[];
}

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          tickFormatter={(v) =>
            new Date(v).toLocaleDateString("en-LK", {
              month: "short",
              day: "numeric",
            })
          }
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          labelFormatter={(v) => new Date(v).toLocaleDateString("en-LK")}
          formatter={(v: number) => [`LKR ${v.toLocaleString()}`, "Revenue"]}
        />
        <Area
          type="monotone"
          dataKey="amount"
          stroke="#10b981"
          fill="#d1fae5"
          strokeWidth={2}
          name="Revenue"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

---

### Task 9.4 — CuisinePopularityChart component

Create `src/components/admin/analytics/CuisinePopularityChart.tsx`:

```typescript
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CuisinePoint } from "@/types/admin";

interface CuisinePopularityChartProps {
  data: CuisinePoint[];
}

export function CuisinePopularityChart({ data }: CuisinePopularityChartProps) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis type="number" tick={{ fontSize: 12 }} />
        <YAxis
          type="category"
          dataKey="cuisine"
          width={100}
          tick={{ fontSize: 12 }}
        />
        <Tooltip />
        <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Bookings" />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

---

### Task 9.5 — UserGrowthChart component

Create `src/components/admin/analytics/UserGrowthChart.tsx`:

```typescript
"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TimeSeriesPoint } from "@/types/admin";

interface UserGrowthChartProps {
  data: TimeSeriesPoint[];
}

export function UserGrowthChart({ data }: UserGrowthChartProps) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          tickFormatter={(v) =>
            new Date(v).toLocaleDateString("en-LK", {
              month: "short",
              day: "numeric",
            })
          }
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          labelFormatter={(v) => new Date(v).toLocaleDateString("en-LK")}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={false}
          name="New Users"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

---

### Task 9.6 — ReservationStatusPieChart component

Create `src/components/admin/analytics/ReservationStatusPieChart.tsx`:

```typescript
"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { StatusPoint } from "@/types/admin";

interface ReservationStatusPieChartProps {
  data: StatusPoint[];
}

const COLORS: Record<string, string> = {
  CONFIRMED: "#3b82f6",
  PENDING: "#f59e0b",
  COMPLETED: "#10b981",
  CANCELLED: "#ef4444",
  NO_SHOW: "#6b7280",
};

export function ReservationStatusPieChart({
  data,
}: ReservationStatusPieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="status"
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={({ status, percent }) =>
            `${status} ${(percent * 100).toFixed(0)}%`
          }
          labelLine={false}
        >
          {data.map((entry) => (
            <Cell
              key={entry.status}
              fill={COLORS[entry.status] ?? "#94a3b8"}
            />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => [v, "Reservations"]} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
```

---

### Task 9.7 — Analytics page (SSR)

Create `src/app/admin/analytics/page.tsx`:

```typescript
import { serverFetch } from "@/lib/server/api";
import { PageHeader } from "@/components/admin/PageHeader";
import { ChartCard } from "@/components/admin/analytics/ChartCard";
import { ReservationsTrendChart } from "@/components/admin/analytics/ReservationsTrendChart";
import { RevenueTrendChart } from "@/components/admin/analytics/RevenueTrendChart";
import { CuisinePopularityChart } from "@/components/admin/analytics/CuisinePopularityChart";
import { UserGrowthChart } from "@/components/admin/analytics/UserGrowthChart";
import { ReservationStatusPieChart } from "@/components/admin/analytics/ReservationStatusPieChart";
import {
  AnalyticsData,
  TimeSeriesPoint,
  CuisinePoint,
  StatusPoint,
} from "@/types/admin";

export default async function AnalyticsPage() {
  const [
    reservationsTrend,
    revenueTrend,
    cuisinePopularity,
    userGrowth,
    reservationStatus,
  ] = await Promise.all([
    serverFetch<TimeSeriesPoint[]>("admin/analytics/reservations"),
    serverFetch<TimeSeriesPoint[]>("admin/analytics/revenue"),
    serverFetch<CuisinePoint[]>("admin/analytics/cuisines"),
    serverFetch<TimeSeriesPoint[]>("admin/analytics/users"),
    serverFetch<StatusPoint[]>("admin/analytics/reservation-status"),
  ]);

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="System performance and usage trends"
      />

      <div className="grid gap-6 p-8 md:grid-cols-2">
        <ChartCard
          title="Reservations Over Time"
          description="Daily reservation counts (last 30 days)"
        >
          <ReservationsTrendChart data={reservationsTrend} />
        </ChartCard>

        <ChartCard
          title="Revenue Over Time"
          description="Daily revenue in LKR (last 30 days)"
        >
          <RevenueTrendChart data={revenueTrend} />
        </ChartCard>

        <ChartCard
          title="Popular Cuisines"
          description="Reservation count by cuisine type"
        >
          <CuisinePopularityChart data={cuisinePopularity} />
        </ChartCard>

        <ChartCard
          title="User Growth"
          description="New user registrations (last 30 days)"
        >
          <UserGrowthChart data={userGrowth} />
        </ChartCard>

        <ChartCard
          title="Reservation Status Breakdown"
          description="Distribution across all statuses"
        >
          <ReservationStatusPieChart data={reservationStatus} />
        </ChartCard>
      </div>
    </div>
  );
}
```

---

### Commit

```bash
git add src/app/admin/analytics/page.tsx \
        src/components/admin/analytics/
git commit -m "feat(admin): analytics page with 5 Recharts visualizations"
```
