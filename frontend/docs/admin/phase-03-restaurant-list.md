# Phase 3: Restaurant Management — List Page

## Goal
SSR page listing all restaurants with status badges (active/inactive, verified/unverified). Includes a CSR-powered filter bar (search, cuisine, area, status), toggle active/inactive in one click, and pagination.

## Architecture
```
/admin/restaurants/page.tsx       — async Server Component, reads searchParams for filters
components/admin/
  RestaurantTable.tsx              — CSR table with action buttons
  RestaurantFilters.tsx            — CSR filter bar (updates URL search params)
  ToggleRestaurantButton.tsx       — CSR inline toggle button
  PaginationBar.tsx                — Reusable CSR pagination (shared across phases)
```

## shadcn Components to Install

```bash
npx shadcn-ui@latest add input select separator
```

---

## Files

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/app/admin/restaurants/page.tsx` | SSR — reads searchParams, fetches filtered list |
| Create | `src/components/admin/RestaurantTable.tsx` | CSR table with toggle + view actions |
| Create | `src/components/admin/RestaurantFilters.tsx` | CSR filter controls → updates URL params |
| Create | `src/components/admin/ToggleRestaurantButton.tsx` | CSR optimistic toggle button |
| Create | `src/components/admin/PaginationBar.tsx` | Reusable CSR pagination component |

---

## Backend Endpoints Used

| Endpoint | Params | Response |
|----------|--------|----------|
| `GET /api/admin/restaurants` | `page`, `limit`, `search`, `verified`, `active` | `{ data: Restaurant[], total, page, limit }` |
| `PATCH /api/admin/restaurants/:id` | `{ isActive: boolean }` | Updated restaurant |

---

## Types (shared)

Create `src/types/admin.ts` (add to if it already exists):

```typescript
export interface AdminRestaurant {
  id: string;
  name: string;
  area: string;
  phone: string | null;
  email: string | null;
  cuisineTypes: string[];
  priceRange: "BUDGET" | "MODERATE" | "EXPENSIVE" | "FINE_DINING";
  avgRating: number | null;
  totalReviews: number;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  admin: { name: string | null; email: string };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
```

---

## Tasks

### Task 3.1 — PaginationBar (reusable across all list pages)

Create `src/components/admin/PaginationBar.tsx`:

```typescript
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationBarProps {
  page: number;
  total: number;
  limit: number;
}

export function PaginationBar({ page, total, limit }: PaginationBarProps) {
  const totalPages = Math.ceil(total / limit);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center justify-between px-2 py-4">
      <p className="text-sm text-slate-500">
        Page {page} of {totalPages} &mdash; {total} total
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => goToPage(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => goToPage(page + 1)}
          disabled={page >= totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

---

### Task 3.2 — RestaurantFilters component

Create `src/components/admin/RestaurantFilters.tsx`:

```typescript
"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { useCallback } from "react";

export function RestaurantFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page"); // reset to page 1 on filter change
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const clearFilters = () => {
    router.push(pathname);
  };

  const hasFilters =
    searchParams.has("search") ||
    searchParams.has("verified") ||
    searchParams.has("active");

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search restaurants..."
          defaultValue={searchParams.get("search") ?? ""}
          className="pl-9 w-64"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateParam("search", (e.target as HTMLInputElement).value);
            }
          }}
        />
      </div>

      <Select
        defaultValue={searchParams.get("verified") ?? "all"}
        onValueChange={(v) => updateParam("verified", v)}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Verification" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All verification</SelectItem>
          <SelectItem value="true">Verified only</SelectItem>
          <SelectItem value="false">Unverified only</SelectItem>
        </SelectContent>
      </Select>

      <Select
        defaultValue={searchParams.get("active") ?? "all"}
        onValueChange={(v) => updateParam("active", v)}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All status</SelectItem>
          <SelectItem value="true">Active</SelectItem>
          <SelectItem value="false">Inactive</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="mr-1 h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
```

---

### Task 3.3 — ToggleRestaurantButton component

Create `src/components/admin/ToggleRestaurantButton.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ToggleRestaurantButtonProps {
  id: string;
  isActive: boolean;
}

export function ToggleRestaurantButton({
  id,
  isActive: initialActive,
}: ToggleRestaurantButtonProps) {
  const [active, setActive] = useState(initialActive);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/proxy/admin/restaurants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !active }),
      });
      if (res.ok) setActive(!active);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={active ? "outline" : "default"}
      size="sm"
      onClick={toggle}
      disabled={loading}
    >
      {loading ? "…" : active ? "Disable" : "Enable"}
    </Button>
  );
}
```

---

### Task 3.4 — RestaurantTable component

Create `src/components/admin/RestaurantTable.tsx`:

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
import Link from "next/link";
import { CheckCircle2, XCircle, Eye } from "lucide-react";
import { ToggleRestaurantButton } from "./ToggleRestaurantButton";
import { AdminRestaurant } from "@/types/admin";

interface RestaurantTableProps {
  restaurants: AdminRestaurant[];
}

const PRICE_LABELS: Record<string, string> = {
  BUDGET: "Budget",
  MODERATE: "Moderate",
  EXPENSIVE: "Expensive",
  FINE_DINING: "Fine Dining",
};

export function RestaurantTable({ restaurants }: RestaurantTableProps) {
  if (restaurants.length === 0) {
    return (
      <div className="rounded-lg border bg-white py-16 text-center text-slate-400">
        No restaurants found
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead>Name</TableHead>
            <TableHead>Area</TableHead>
            <TableHead>Cuisines</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>Verified</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {restaurants.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <div className="font-medium">{r.name}</div>
                <div className="text-xs text-slate-400">{r.admin.email}</div>
              </TableCell>
              <TableCell className="text-sm">{r.area}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {r.cuisineTypes.slice(0, 2).map((c) => (
                    <Badge key={c} variant="secondary" className="text-xs">
                      {c}
                    </Badge>
                  ))}
                  {r.cuisineTypes.length > 2 && (
                    <Badge variant="secondary" className="text-xs">
                      +{r.cuisineTypes.length - 2}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-sm">
                {PRICE_LABELS[r.priceRange]}
              </TableCell>
              <TableCell className="text-sm">
                {r.avgRating != null ? (
                  <span className="font-medium">
                    {r.avgRating.toFixed(1)} ⭐
                  </span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </TableCell>
              <TableCell>
                {r.isVerified ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-slate-300" />
                )}
              </TableCell>
              <TableCell>
                <Badge variant={r.isActive ? "default" : "destructive"}>
                  {r.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Link href={`/admin/restaurants/${r.id}`}>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  <ToggleRestaurantButton
                    id={r.id}
                    isActive={r.isActive}
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

### Task 3.5 — Restaurant list page (SSR)

Create `src/app/admin/restaurants/page.tsx`:

```typescript
import { serverFetch } from "@/lib/server/api";
import { PageHeader } from "@/components/admin/PageHeader";
import { RestaurantTable } from "@/components/admin/RestaurantTable";
import { RestaurantFilters } from "@/components/admin/RestaurantFilters";
import { PaginationBar } from "@/components/admin/PaginationBar";
import { AdminRestaurant, PaginatedResponse } from "@/types/admin";

interface SearchParams {
  page?: string;
  search?: string;
  verified?: string;
  active?: string;
}

export default async function RestaurantsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const page = Number(searchParams.page ?? 1);
  const limit = 20;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(searchParams.search ? { search: searchParams.search } : {}),
    ...(searchParams.verified ? { verified: searchParams.verified } : {}),
    ...(searchParams.active ? { active: searchParams.active } : {}),
  });

  const result = await serverFetch<PaginatedResponse<AdminRestaurant>>(
    `admin/restaurants?${params.toString()}`
  );

  return (
    <div>
      <PageHeader
        title="Restaurants"
        description={`${result.total} total restaurants`}
      />

      <div className="space-y-4 p-8">
        <RestaurantFilters />
        <RestaurantTable restaurants={result.data} />
        <PaginationBar page={page} total={result.total} limit={limit} />
      </div>
    </div>
  );
}
```

---

### Commit

```bash
git add src/types/admin.ts src/app/admin/restaurants/page.tsx \
        src/components/admin/RestaurantTable.tsx \
        src/components/admin/RestaurantFilters.tsx \
        src/components/admin/ToggleRestaurantButton.tsx \
        src/components/admin/PaginationBar.tsx
git commit -m "feat(admin): restaurant list page with filters, toggle, and pagination"
```
