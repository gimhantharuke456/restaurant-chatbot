# Phase 6: User Management

## Goal
SSR page at `/admin/users` listing all registered users. Admins can view a user's profile, change their role (CUSTOMER → RESTAURANT_ADMIN → SYSTEM_ADMIN), and see their reservation count. Filtering by role. Role change via inline select (CSR) with confirmation dialog.

## Architecture
```
/admin/users/page.tsx               — SSR, reads searchParams for role filter
/admin/users/[id]/page.tsx          — SSR user profile detail
components/admin/
  UserTable.tsx                     — CSR table with inline role changer
  UserRoleSelect.tsx                — CSR select + confirm before changing role
  UserProfileCard.tsx               — Static user info card
  UserReservationHistory.tsx        — User's reservation list
```

## shadcn Components to Install

```bash
npx shadcn-ui@latest add avatar
```

---

## Files

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/app/admin/users/page.tsx` | SSR user list with role filter |
| Create | `src/app/admin/users/[id]/page.tsx` | SSR user detail |
| Create | `src/components/admin/UserTable.tsx` | CSR table with role change |
| Create | `src/components/admin/UserRoleSelect.tsx` | CSR role selector + confirm |
| Create | `src/components/admin/UserProfileCard.tsx` | Display user info |
| Create | `src/components/admin/UserReservationHistory.tsx` | User's reservations list |
| Modify | `src/types/admin.ts` | Add AdminUser types |

---

## Backend Endpoints Used

| Endpoint | Params | Response |
|----------|--------|----------|
| `GET /api/admin/users` | `page`, `limit`, `role` | `{ data: AdminUser[], total, page, limit }` |
| `GET /api/admin/users/:id` | — | User + reservations |
| `PATCH /api/admin/users/:id/role` | `{ role: string }` | Updated user |

---

## Types (add to `src/types/admin.ts`)

```typescript
export type UserRole = "CUSTOMER" | "RESTAURANT_ADMIN" | "SYSTEM_ADMIN";

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: string;
  _count: {
    reservations: number;
    reviews: number;
    managedRestaurants: number;
  };
}

export interface AdminUserDetail extends AdminUser {
  reservations: Array<{
    id: string;
    date: string;
    time: string;
    status: string;
    restaurant: { name: string };
  }>;
  managedRestaurants: Array<{ id: string; name: string; isVerified: boolean }>;
}
```

---

## Tasks

### Task 6.1 — UserRoleSelect component

Create `src/components/admin/UserRoleSelect.tsx`:

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
import { UserRole } from "@/types/admin";

interface UserRoleSelectProps {
  userId: string;
  currentRole: UserRole;
}

const ROLES: UserRole[] = ["CUSTOMER", "RESTAURANT_ADMIN", "SYSTEM_ADMIN"];

const ROLE_LABELS: Record<UserRole, string> = {
  CUSTOMER: "Customer",
  RESTAURANT_ADMIN: "Restaurant Admin",
  SYSTEM_ADMIN: "System Admin",
};

export function UserRoleSelect({ userId, currentRole }: UserRoleSelectProps) {
  const [role, setRole] = useState<UserRole>(currentRole);
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);
  const [saving, setSaving] = useState(false);

  const handleValueChange = (value: string) => {
    setPendingRole(value as UserRole);
  };

  const confirmChange = async () => {
    if (!pendingRole) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/proxy/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: pendingRole }),
      });
      if (res.ok) setRole(pendingRole);
    } finally {
      setSaving(false);
      setPendingRole(null);
    }
  };

  return (
    <>
      <Select
        value={role}
        onValueChange={handleValueChange}
        disabled={saving}
      >
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ROLES.map((r) => (
            <SelectItem key={r} value={r}>
              {ROLE_LABELS[r]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <AlertDialog
        open={pendingRole !== null}
        onOpenChange={(o) => !o && setPendingRole(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change user role?</AlertDialogTitle>
            <AlertDialogDescription>
              This will change the user's role to{" "}
              <strong>{pendingRole ? ROLE_LABELS[pendingRole] : ""}</strong>.
              This affects what they can access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmChange}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

---

### Task 6.2 — UserTable component

Create `src/components/admin/UserTable.tsx`:

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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { Eye } from "lucide-react";
import { UserRoleSelect } from "./UserRoleSelect";
import { AdminUser } from "@/types/admin";

interface UserTableProps {
  users: AdminUser[];
}

const ROLE_BADGE: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  CUSTOMER: "secondary",
  RESTAURANT_ADMIN: "default",
  SYSTEM_ADMIN: "destructive",
};

export function UserTable({ users }: UserTableProps) {
  if (users.length === 0) {
    return (
      <div className="rounded-lg border bg-white py-16 text-center text-slate-400">
        No users found
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead>User</TableHead>
            <TableHead>Current Role</TableHead>
            <TableHead>Reservations</TableHead>
            <TableHead>Reviews</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Change Role</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {(user.name ?? user.email).slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium">
                      {user.name ?? "(no name)"}
                    </div>
                    <div className="text-xs text-slate-400">{user.email}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={ROLE_BADGE[user.role] ?? "outline"}>
                  {user.role.replace("_", " ")}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">
                {user._count.reservations}
              </TableCell>
              <TableCell className="text-sm">{user._count.reviews}</TableCell>
              <TableCell className="text-sm text-slate-400">
                {new Date(user.createdAt).toLocaleDateString("en-LK")}
              </TableCell>
              <TableCell>
                <UserRoleSelect userId={user.id} currentRole={user.role} />
              </TableCell>
              <TableCell className="text-right">
                <Link href={`/admin/users/${user.id}`}>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
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

### Task 6.3 — Users list page (SSR)

Create `src/app/admin/users/page.tsx`:

```typescript
import { serverFetch } from "@/lib/server/api";
import { PageHeader } from "@/components/admin/PageHeader";
import { UserTable } from "@/components/admin/UserTable";
import { PaginationBar } from "@/components/admin/PaginationBar";
import { AdminUser, PaginatedResponse } from "@/types/admin";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SearchParams {
  page?: string;
  role?: string;
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const page = Number(searchParams.page ?? 1);
  const limit = 20;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(searchParams.role ? { role: searchParams.role } : {}),
  });

  const result = await serverFetch<PaginatedResponse<AdminUser>>(
    `admin/users?${params.toString()}`
  );

  return (
    <div>
      <PageHeader
        title="Users"
        description={`${result.total} registered users`}
      />

      <div className="space-y-4 p-8">
        {/* Role filter — this must be a CSR component to change URL */}
        {/* Wrap in a client boundary using a thin component */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">Filter by role:</span>
          <UserRoleFilter currentRole={searchParams.role} />
        </div>

        <UserTable users={result.data} />
        <PaginationBar page={page} total={result.total} limit={limit} />
      </div>
    </div>
  );
}
```

Create `src/components/admin/UserRoleFilter.tsx`:

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

interface UserRoleFilterProps {
  currentRole?: string;
}

export function UserRoleFilter({ currentRole }: UserRoleFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("role");
    } else {
      params.set("role", value);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Select
      defaultValue={currentRole ?? "all"}
      onValueChange={handleChange}
    >
      <SelectTrigger className="w-48">
        <SelectValue placeholder="All roles" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All roles</SelectItem>
        <SelectItem value="CUSTOMER">Customer</SelectItem>
        <SelectItem value="RESTAURANT_ADMIN">Restaurant Admin</SelectItem>
        <SelectItem value="SYSTEM_ADMIN">System Admin</SelectItem>
      </SelectContent>
    </Select>
  );
}
```

---

### Task 6.4 — UserProfileCard component

Create `src/components/admin/UserProfileCard.tsx`:

```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AdminUserDetail } from "@/types/admin";

interface UserProfileCardProps {
  user: AdminUserDetail;
}

export function UserProfileCard({ user }: UserProfileCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.avatarUrl ?? undefined} />
            <AvatarFallback className="text-xl">
              {(user.name ?? user.email).slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-lg font-semibold">
              {user.name ?? "(no name)"}
            </h2>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>
        </div>

        <div className="grid gap-3 text-sm md:grid-cols-2">
          <div>
            <span className="font-medium text-slate-500">Role:</span>{" "}
            <Badge variant="secondary">{user.role.replace("_", " ")}</Badge>
          </div>
          {user.phone && (
            <div>
              <span className="font-medium text-slate-500">Phone:</span>{" "}
              {user.phone}
            </div>
          )}
          <div>
            <span className="font-medium text-slate-500">Joined:</span>{" "}
            {new Date(user.createdAt).toLocaleDateString("en-LK")}
          </div>
          <div>
            <span className="font-medium text-slate-500">Reservations:</span>{" "}
            {user._count.reservations}
          </div>
          <div>
            <span className="font-medium text-slate-500">Reviews:</span>{" "}
            {user._count.reviews}
          </div>
          {user.role === "RESTAURANT_ADMIN" && (
            <div>
              <span className="font-medium text-slate-500">Managed restaurants:</span>{" "}
              {user._count.managedRestaurants}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### Task 6.5 — UserReservationHistory component

Create `src/components/admin/UserReservationHistory.tsx`:

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
import { AdminUserDetail } from "@/types/admin";

interface UserReservationHistoryProps {
  reservations: AdminUserDetail["reservations"];
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

export function UserReservationHistory({
  reservations,
}: UserReservationHistoryProps) {
  if (reservations.length === 0) {
    return (
      <p className="py-8 text-center text-slate-400">No reservations yet</p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead>Restaurant</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reservations.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">
                {r.restaurant.name}
              </TableCell>
              <TableCell className="text-sm">
                {new Date(r.date).toLocaleDateString("en-LK")}
              </TableCell>
              <TableCell className="text-sm">{r.time}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[r.status] ?? "outline"}>
                  {r.status}
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

### Task 6.6 — User detail page (SSR)

Create `src/app/admin/users/[id]/page.tsx`:

```typescript
import { serverFetch } from "@/lib/server/api";
import { PageHeader } from "@/components/admin/PageHeader";
import { UserProfileCard } from "@/components/admin/UserProfileCard";
import { UserReservationHistory } from "@/components/admin/UserReservationHistory";
import { UserRoleSelect } from "@/components/admin/UserRoleSelect";
import { TabPanel } from "@/components/admin/TabPanel";
import { AdminUserDetail } from "@/types/admin";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default async function UserDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await serverFetch<AdminUserDetail>(
    `admin/users/${params.id}`
  );

  return (
    <div>
      <PageHeader
        title={user.name ?? user.email}
        description={user.email}
        actions={
          <div className="flex items-center gap-3">
            <Link href="/admin/users">
              <Button variant="ghost" size="sm">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            </Link>
            <UserRoleSelect userId={user.id} currentRole={user.role} />
          </div>
        }
      />

      <div className="p-8">
        <TabPanel
          tabs={[
            {
              value: "profile",
              label: "Profile",
              content: <UserProfileCard user={user} />,
            },
            {
              value: "reservations",
              label: `Reservations (${user.reservations.length})`,
              content: (
                <UserReservationHistory
                  reservations={user.reservations}
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
git add src/app/admin/users/ \
        src/components/admin/UserTable.tsx \
        src/components/admin/UserRoleSelect.tsx \
        src/components/admin/UserRoleFilter.tsx \
        src/components/admin/UserProfileCard.tsx \
        src/components/admin/UserReservationHistory.tsx
git commit -m "feat(admin): user management with role assignment and profile detail"
```
