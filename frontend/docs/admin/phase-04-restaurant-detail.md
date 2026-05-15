# Phase 4: Restaurant Detail & Edit Page

## Goal
SSR detail page for a single restaurant at `/admin/restaurants/[id]`. Shows full restaurant info, menu items, and reviews in tabbed layout. Includes an inline edit form (CSR) that PATCHes via proxy. Separate verify action button.

## Architecture
```
/admin/restaurants/[id]/page.tsx    — SSR, fetches restaurant + menu + reviews
components/admin/
  RestaurantDetailCard.tsx          — Static info card (name, contact, hours)
  RestaurantEditForm.tsx            — CSR edit form with optimistic UI
  MenuItemsTable.tsx                — Read-only menu list
  ReviewsTable.tsx                  — Moderation table (flag/hide review)
  VerifyRestaurantButton.tsx        — CSR one-click verify action
  TabPanel.tsx                      — Reusable CSR tab switcher
```

## shadcn Components to Install

```bash
npx shadcn-ui@latest add tabs label textarea dialog
```

---

## Files

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/app/admin/restaurants/[id]/page.tsx` | SSR — fetches restaurant detail |
| Create | `src/components/admin/RestaurantDetailCard.tsx` | Display-only info section |
| Create | `src/components/admin/RestaurantEditForm.tsx` | CSR form, PATCHes via proxy |
| Create | `src/components/admin/MenuItemsTable.tsx` | Menu list for the restaurant |
| Create | `src/components/admin/ReviewsTable.tsx` | Reviews with delete action |
| Create | `src/components/admin/VerifyRestaurantButton.tsx` | CSR verify button |
| Create | `src/components/admin/TabPanel.tsx` | Reusable tab wrapper |

---

## Backend Endpoints Used

| Endpoint | Response |
|----------|----------|
| `GET /api/admin/restaurants/:id` | Full restaurant + admin info |
| `GET /api/restaurants/:id/menu` | Array of menu items |
| `GET /api/restaurants/:id` (reviews via relation) | Reviews array |
| `PATCH /api/admin/restaurants/:id` | Partial update |
| `POST /api/admin/restaurants/:id/verify` | Mark verified |

---

## Types (add to `src/types/admin.ts`)

```typescript
export interface AdminRestaurantDetail extends AdminRestaurant {
  description: string | null;
  address: string;
  website: string | null;
  openingHours: Record<string, string>;
  imageUrls: string[];
  reviews: AdminReview[];
  menuItems: MenuItem[];
}

export interface AdminReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: { name: string | null; email: string };
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  dietaryInfo: string[];
  isAvailable: boolean;
}
```

---

## Tasks

### Task 4.1 — VerifyRestaurantButton component

Create `src/components/admin/VerifyRestaurantButton.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface VerifyRestaurantButtonProps {
  id: string;
  isVerified: boolean;
}

export function VerifyRestaurantButton({
  id,
  isVerified: initialVerified,
}: VerifyRestaurantButtonProps) {
  const [verified, setVerified] = useState(initialVerified);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (verified) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <CheckCircle2 className="h-4 w-4" />
        Verified
      </div>
    );
  }

  const handleVerify = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/proxy/admin/restaurants/${id}/verify`, {
        method: "POST",
      });
      if (res.ok) {
        setVerified(true);
        router.refresh(); // re-run SSR to reflect change
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleVerify} disabled={loading} variant="outline">
      <CheckCircle2 className="mr-2 h-4 w-4" />
      {loading ? "Verifying…" : "Verify Restaurant"}
    </Button>
  );
}
```

---

### Task 4.2 — TabPanel component

Create `src/components/admin/TabPanel.tsx`:

```typescript
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReactNode } from "react";

interface Tab {
  value: string;
  label: string;
  content: ReactNode;
}

interface TabPanelProps {
  tabs: Tab[];
  defaultValue?: string;
}

export function TabPanel({ tabs, defaultValue }: TabPanelProps) {
  return (
    <Tabs defaultValue={defaultValue ?? tabs[0]?.value}>
      <TabsList className="mb-6">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value}>
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
```

---

### Task 4.3 — RestaurantDetailCard component

Create `src/components/admin/RestaurantDetailCard.tsx`:

```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminRestaurantDetail } from "@/types/admin";

interface RestaurantDetailCardProps {
  restaurant: AdminRestaurantDetail;
}

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export function RestaurantDetailCard({ restaurant }: RestaurantDetailCardProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <span className="font-medium text-slate-500">Address:</span>{" "}
            {restaurant.address}
          </div>
          <div>
            <span className="font-medium text-slate-500">Area:</span>{" "}
            {restaurant.area}
          </div>
          {restaurant.phone && (
            <div>
              <span className="font-medium text-slate-500">Phone:</span>{" "}
              {restaurant.phone}
            </div>
          )}
          {restaurant.email && (
            <div>
              <span className="font-medium text-slate-500">Email:</span>{" "}
              {restaurant.email}
            </div>
          )}
          {restaurant.website && (
            <div>
              <span className="font-medium text-slate-500">Website:</span>{" "}
              <a
                href={restaurant.website}
                className="text-blue-600 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {restaurant.website}
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Opening Hours</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {DAYS.map((day) => (
            <div key={day} className="flex justify-between capitalize">
              <span className="font-medium text-slate-500">{day}</span>
              <span>
                {restaurant.openingHours[day] ?? (
                  <span className="text-slate-400">Closed</span>
                )}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Description</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700">
          {restaurant.description ?? (
            <span className="text-slate-400">No description</span>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### Task 4.4 — RestaurantEditForm component

Create `src/components/admin/RestaurantEditForm.tsx`:

```typescript
"use client";

import { useState } from "react";
import { AdminRestaurantDetail } from "@/types/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";

interface RestaurantEditFormProps {
  restaurant: AdminRestaurantDetail;
}

export function RestaurantEditForm({ restaurant }: RestaurantEditFormProps) {
  const [form, setForm] = useState({
    name: restaurant.name,
    description: restaurant.description ?? "",
    address: restaurant.address,
    area: restaurant.area,
    phone: restaurant.phone ?? "",
    email: restaurant.email ?? "",
    website: restaurant.website ?? "",
    priceRange: restaurant.priceRange,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  const handleChange =
    (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(
        `/api/proxy/admin/restaurants/${restaurant.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      if (res.ok) {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={form.name} onChange={handleChange("name")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="area">Area</Label>
          <Input id="area" value={form.area} onChange={handleChange("area")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={form.address}
            onChange={handleChange("address")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="priceRange">Price Range</Label>
          <Select
            value={form.priceRange}
            onValueChange={(v) =>
              setForm((p) => ({ ...p, priceRange: v as typeof form.priceRange }))
            }
          >
            <SelectTrigger id="priceRange">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BUDGET">Budget</SelectItem>
              <SelectItem value="MODERATE">Moderate</SelectItem>
              <SelectItem value="EXPENSIVE">Expensive</SelectItem>
              <SelectItem value="FINE_DINING">Fine Dining</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={form.phone}
            onChange={handleChange("phone")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={handleChange("email")}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            value={form.website}
            onChange={handleChange("website")}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={form.description}
            onChange={handleChange("description")}
            rows={4}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </Button>
        {saved && (
          <span className="text-sm text-green-600">Changes saved!</span>
        )}
      </div>
    </form>
  );
}
```

---

### Task 4.5 — MenuItemsTable component

Create `src/components/admin/MenuItemsTable.tsx`:

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
import { MenuItem } from "@/types/admin";

interface MenuItemsTableProps {
  items: MenuItem[];
}

export function MenuItemsTable({ items }: MenuItemsTableProps) {
  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-slate-400">No menu items</p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead>Item</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Dietary</TableHead>
            <TableHead>Available</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <div className="font-medium">{item.name}</div>
                {item.description && (
                  <div className="max-w-xs truncate text-xs text-slate-400">
                    {item.description}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{item.category}</Badge>
              </TableCell>
              <TableCell className="font-medium">
                LKR {item.price.toLocaleString()}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {item.dietaryInfo.map((d) => (
                    <Badge key={d} variant="outline" className="text-xs">
                      {d}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={item.isAvailable ? "default" : "secondary"}>
                  {item.isAvailable ? "Yes" : "No"}
                </Badge>
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

### Task 4.6 — ReviewsTable component

Create `src/components/admin/ReviewsTable.tsx`:

```typescript
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AdminReview } from "@/types/admin";
import { useState } from "react";
import { Trash2 } from "lucide-react";

interface ReviewsTableProps {
  reviews: AdminReview[];
  restaurantId: string;
}

export function ReviewsTable({ reviews, restaurantId }: ReviewsTableProps) {
  const [items, setItems] = useState(reviews);

  const deleteReview = async (id: string) => {
    const res = await fetch(
      `/api/proxy/admin/restaurants/${restaurantId}/reviews/${id}`,
      { method: "DELETE" }
    );
    if (res.ok) setItems((prev) => prev.filter((r) => r.id !== id));
  };

  if (items.length === 0) {
    return <p className="py-8 text-center text-slate-400">No reviews yet</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead>User</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>Comment</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((review) => (
            <TableRow key={review.id}>
              <TableCell>
                <div className="text-sm font-medium">
                  {review.user.name ?? review.user.email}
                </div>
              </TableCell>
              <TableCell>{"⭐".repeat(review.rating)}</TableCell>
              <TableCell className="max-w-xs">
                <p className="truncate text-sm">
                  {review.comment ?? <span className="text-slate-400">—</span>}
                </p>
              </TableCell>
              <TableCell className="text-sm text-slate-500">
                {new Date(review.createdAt).toLocaleDateString("en-LK")}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => deleteReview(review.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
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

### Task 4.7 — Restaurant detail page (SSR)

Create `src/app/admin/restaurants/[id]/page.tsx`:

```typescript
import { serverFetch } from "@/lib/server/api";
import { PageHeader } from "@/components/admin/PageHeader";
import { RestaurantDetailCard } from "@/components/admin/RestaurantDetailCard";
import { RestaurantEditForm } from "@/components/admin/RestaurantEditForm";
import { MenuItemsTable } from "@/components/admin/MenuItemsTable";
import { ReviewsTable } from "@/components/admin/ReviewsTable";
import { VerifyRestaurantButton } from "@/components/admin/VerifyRestaurantButton";
import { ToggleRestaurantButton } from "@/components/admin/ToggleRestaurantButton";
import { TabPanel } from "@/components/admin/TabPanel";
import { AdminRestaurantDetail } from "@/types/admin";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default async function RestaurantDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const restaurant = await serverFetch<AdminRestaurantDetail>(
    `admin/restaurants/${params.id}`
  );

  return (
    <div>
      <PageHeader
        title={restaurant.name}
        description={`${restaurant.area} · ${restaurant.cuisineTypes.join(", ")}`}
        actions={
          <div className="flex items-center gap-3">
            <Link href="/admin/restaurants">
              <Button variant="ghost" size="sm">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            </Link>
            <ToggleRestaurantButton
              id={restaurant.id}
              isActive={restaurant.isActive}
            />
            <VerifyRestaurantButton
              id={restaurant.id}
              isVerified={restaurant.isVerified}
            />
          </div>
        }
      />

      <div className="p-8">
        <TabPanel
          tabs={[
            {
              value: "details",
              label: "Details",
              content: <RestaurantDetailCard restaurant={restaurant} />,
            },
            {
              value: "edit",
              label: "Edit",
              content: <RestaurantEditForm restaurant={restaurant} />,
            },
            {
              value: "menu",
              label: `Menu (${restaurant.menuItems.length})`,
              content: <MenuItemsTable items={restaurant.menuItems} />,
            },
            {
              value: "reviews",
              label: `Reviews (${restaurant.reviews.length})`,
              content: (
                <ReviewsTable
                  reviews={restaurant.reviews}
                  restaurantId={restaurant.id}
                />
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
```

---

### Commit

```bash
git add src/app/admin/restaurants/[id]/page.tsx \
        src/components/admin/RestaurantDetailCard.tsx \
        src/components/admin/RestaurantEditForm.tsx \
        src/components/admin/MenuItemsTable.tsx \
        src/components/admin/ReviewsTable.tsx \
        src/components/admin/VerifyRestaurantButton.tsx \
        src/components/admin/TabPanel.tsx \
        src/types/admin.ts
git commit -m "feat(admin): restaurant detail page with edit form, menu, and reviews"
```
