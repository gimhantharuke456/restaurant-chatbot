# Phase 1: Foundation — Layout, SSR Auth & Proxy API

## Goal
Establish the admin shell: proxy route to the backend, server-side token verification via cookies, SSR-safe layout with sidebar, and shared server-side fetch helpers. Every subsequent phase builds on this.

## Architecture

```
No Next.js middleware. Instead:
  - Cookie stores Firebase token (set on login)
  - Server Components read cookie → validate via backend /auth/me
  - Next.js Route Handler at /api/proxy/[...path] proxies all admin API calls
  - Pages are async Server Components (SSR)
  - Interactive parts are "use client" components passed data as props
```

## shadcn Components to Install

```bash
cd frontend
npx shadcn-ui@latest add button sidebar separator avatar dropdown-menu
```

---

## Files

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/lib/server/auth.ts` | Read & verify admin session from cookie server-side |
| Create | `src/lib/server/api.ts` | Server-side fetch wrapper (attaches token from cookie) |
| Create | `src/app/api/proxy/[...path]/route.ts` | Proxy handler — forwards client requests to backend |
| Create | `src/lib/cookie.ts` | Shared cookie name constants |
| Create | `src/hooks/useSetAuthCookie.ts` | CSR hook — writes Firebase token into cookie on login |
| Create | `src/app/admin/layout.tsx` | SSR admin root layout — redirects if not admin |
| Create | `src/components/admin/AdminShell.tsx` | CSR shell with sidebar + top bar |
| Create | `src/components/admin/AdminSidebar.tsx` | Navigation links |
| Create | `src/components/admin/AdminTopBar.tsx` | Top bar with user avatar + logout |
| Create | `src/components/admin/PageHeader.tsx` | Reusable page title + breadcrumb |

---

## Tasks

### Task 1.1 — Cookie constants

Create `src/lib/cookie.ts`:

```typescript
export const AUTH_COOKIE = "rc_token";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
```

---

### Task 1.2 — CSR hook: write Firebase token into cookie

Create `src/hooks/useSetAuthCookie.ts`:

```typescript
"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AUTH_COOKIE, COOKIE_MAX_AGE } from "@/lib/cookie";

export function useSetAuthCookie() {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdToken();
        document.cookie = `${AUTH_COOKIE}=${token}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
      } else {
        document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`;
      }
    });
    return () => unsubscribe();
  }, []);
}
```

> **Usage:** Call this hook in the root `app/layout.tsx` so the cookie is always kept fresh.

---

### Task 1.3 — Proxy Route Handler

Create `src/app/api/proxy/[...path]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/cookie";

const BACKEND = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:3000";

async function proxy(req: NextRequest, params: { path: string[] }) {
  const path = params.path.join("/");
  const url = `${BACKEND}/api/${path}${req.nextUrl.search}`;

  const token = req.cookies.get(AUTH_COOKIE)?.value;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const body =
    req.method !== "GET" && req.method !== "HEAD"
      ? await req.text()
      : undefined;

  const upstream = await fetch(url, {
    method: req.method,
    headers,
    body,
  });

  const data = await upstream.text();
  return new NextResponse(data, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxy(req, params);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxy(req, params);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxy(req, params);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxy(req, params);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxy(req, params);
}
```

> Add to `.env`: `BACKEND_INTERNAL_URL=http://rc_backend:3000`

---

### Task 1.4 — Server-side fetch helper

Create `src/lib/server/api.ts`:

```typescript
import { cookies } from "next/headers";
import { AUTH_COOKIE } from "@/lib/cookie";

const BACKEND = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:3000";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export async function serverFetch<T>(
  path: string,
  options: { method?: Method; body?: unknown } = {}
): Promise<T> {
  const token = cookies().get(AUTH_COOKIE)?.value;

  const res = await fetch(`${BACKEND}/api/${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Backend error ${res.status}: ${path}`);
  }

  return res.json() as Promise<T>;
}
```

---

### Task 1.5 — Server-side auth validation

Create `src/lib/server/auth.ts`:

```typescript
import { redirect } from "next/navigation";
import { serverFetch } from "./api";

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: "SYSTEM_ADMIN" | "RESTAURANT_ADMIN" | "CUSTOMER";
}

export async function requireAdmin(): Promise<AdminUser> {
  try {
    const user = await serverFetch<AdminUser>("auth/me");
    if (user.role !== "SYSTEM_ADMIN") {
      redirect("/");
    }
    return user;
  } catch {
    redirect("/");
  }
}
```

---

### Task 1.6 — AdminSidebar component (CSR)

Create `src/components/admin/AdminSidebar.tsx`:

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  CalendarDays,
  CreditCard,
  BarChart3,
  Settings,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/restaurants", label: "Restaurants", icon: Building2 },
  { href: "/admin/verification", label: "Verification", icon: ShieldCheck },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/reservations", label: "Reservations", icon: CalendarDays },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/logs", label: "Audit Logs", icon: ScrollText },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col bg-slate-900 text-slate-100">
      <div className="flex h-16 items-center border-b border-slate-700 px-6">
        <span className="text-xl font-bold tracking-tight">RC Admin</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

---

### Task 1.7 — AdminTopBar component (CSR)

Create `src/components/admin/AdminTopBar.tsx`:

```typescript
"use client";

import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { AUTH_COOKIE } from "@/lib/cookie";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminTopBarProps {
  email: string;
  name: string | null;
}

export function AdminTopBar({ email, name }: AdminTopBarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`;
    router.push("/");
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-slate-500" />
          <span className="text-slate-700">{name ?? email}</span>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </header>
  );
}
```

---

### Task 1.8 — Reusable PageHeader component

Create `src/components/admin/PageHeader.tsx`:

```typescript
import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between border-b bg-white px-8 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
```

---

### Task 1.9 — AdminShell (CSR wrapper, owns sidebar toggle state)

Create `src/components/admin/AdminShell.tsx`:

```typescript
"use client";

import { useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopBar } from "./AdminTopBar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminShellProps {
  children: React.ReactNode;
  email: string;
  name: string | null;
}

export function AdminShell({ children, email, name }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transform transition-transform md:relative md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <AdminSidebar />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile menu button */}
        <div className="flex h-16 items-center border-b bg-white px-4 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        <AdminTopBar email={email} name={name} />

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
```

---

### Task 1.10 — Admin root layout (SSR)

Create `src/app/admin/layout.tsx`:

```typescript
import { requireAdmin } from "@/lib/server/auth";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // SSR: validates cookie token, redirects non-admins to /
  const user = await requireAdmin();

  return (
    <AdminShell email={user.email} name={user.name}>
      {children}
    </AdminShell>
  );
}
```

---

### Task 1.11 — Update root layout to write auth cookie

In `src/app/layout.tsx`, import and call `useSetAuthCookie` from a wrapper component:

Create `src/components/AuthCookieWriter.tsx`:

```typescript
"use client";

import { useSetAuthCookie } from "@/hooks/useSetAuthCookie";

export function AuthCookieWriter() {
  useSetAuthCookie();
  return null;
}
```

Then in `src/app/layout.tsx` add `<AuthCookieWriter />` inside the body:

```typescript
import { AuthCookieWriter } from "@/components/AuthCookieWriter";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthCookieWriter />
        {children}
      </body>
    </html>
  );
}
```

---

### Task 1.12 — Add BACKEND_INTERNAL_URL to .env

```
# Add to .env
BACKEND_INTERNAL_URL=http://rc_backend:3000
```

```
# Add to .env for local dev outside Docker
BACKEND_INTERNAL_URL=http://localhost:3000
```

---

### Task 1.13 — Verify layout renders

Start frontend dev server:

```bash
cd frontend
npm run dev
```

Visit `http://localhost:3001/admin` — should redirect to `/` (no valid admin cookie yet).

---

### Commit

```bash
git add src/lib/cookie.ts src/lib/server/ src/hooks/useSetAuthCookie.ts \
        src/app/api/proxy/ src/components/admin/ src/app/admin/layout.tsx \
        src/components/AuthCookieWriter.tsx
git commit -m "feat(admin): foundation — proxy route, SSR auth, layout shell"
```
