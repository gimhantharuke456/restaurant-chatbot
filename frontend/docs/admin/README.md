# Admin Panel — Implementation Plan Index

## Architecture Principles

| Principle | How |
|-----------|-----|
| No Next.js middleware | Cookie-based auth read in each layout/page via `src/lib/server/auth.ts` |
| Every page = SSR | All `page.tsx` files are `async` Server Components — no `"use client"` at page level |
| Components = CSR allowed | `"use client"` lives in component files passed data as props from pages |
| Proxy to backend | `src/app/api/proxy/[...path]/route.ts` forwards all requests with auth token |
| Maximize component reuse | `PaginationBar`, `StatCard`, `TabPanel`, `PageHeader` shared across all phases |

## Phase Overview

| # | Phase | Route | Key Components |
|---|-------|-------|----------------|
| 1 | [Foundation](./phase-01-foundation.md) | `/admin/layout` | Proxy, SSR auth, AdminShell, AdminSidebar, cookie writer |
| 2 | [Dashboard](./phase-02-dashboard.md) | `/admin` | StatCard, StatGrid, DashboardAlerts, RecentReservations |
| 3 | [Restaurant List](./phase-03-restaurant-list.md) | `/admin/restaurants` | RestaurantTable, RestaurantFilters, PaginationBar, ToggleRestaurantButton |
| 4 | [Restaurant Detail](./phase-04-restaurant-detail.md) | `/admin/restaurants/[id]` | RestaurantEditForm, MenuItemsTable, ReviewsTable, VerifyRestaurantButton, TabPanel |
| 5 | [Verification Queue](./phase-05-verification-queue.md) | `/admin/verification` | VerificationQueue, VerificationActionDialog |
| 6 | [User Management](./phase-06-user-management.md) | `/admin/users` | UserTable, UserRoleSelect, UserProfileCard, UserReservationHistory |
| 7 | [Reservations](./phase-07-reservations.md) | `/admin/reservations` | ReservationAdminTable, ReservationStatusButton, DateRangeFilter |
| 8 | [Payments](./phase-08-payments.md) | `/admin/payments` | PaymentTable, RefundButton, PaymentSummary |
| 9 | [Analytics](./phase-09-analytics.md) | `/admin/analytics` | 5× Recharts charts wrapped in ChartCard |
| 10 | [Settings & Logs](./phase-10-settings-logs.md) | `/admin/settings`, `/admin/logs` | SettingsForm, AuditLogTable, ExportLogsButton |

## Shared Components (built once, used everywhere)

| Component | Phase | Used By |
|-----------|-------|---------|
| `PageHeader` | 1 | All pages |
| `PaginationBar` | 3 | Restaurants, Users, Reservations, Payments, Logs |
| `StatCard` + `StatGrid` | 2 | Dashboard, Payments |
| `TabPanel` | 4 | Restaurant Detail, User Detail |
| `ToggleRestaurantButton` | 3 | Restaurant List, Restaurant Detail |
| `DateRangeFilter` | 7 | Reservations |

## Dependency Install Order

```bash
cd frontend

# Phase 1
npx shadcn-ui@latest add button sidebar separator avatar dropdown-menu

# Phase 2
npx shadcn-ui@latest add card badge skeleton table alert

# Phase 3
npx shadcn-ui@latest add input select

# Phase 4
npx shadcn-ui@latest add tabs label textarea dialog

# Phase 5
npx shadcn-ui@latest add alert-dialog

# Phase 6 (avatar already added)

# Phase 7
npx shadcn-ui@latest add popover calendar

# Phase 9
npm install recharts

# Phase 10
npx shadcn-ui@latest add switch
```

## Environment Variables Required

```
# .env
BACKEND_INTERNAL_URL=http://rc_backend:3000   # inside Docker
# or
BACKEND_INTERNAL_URL=http://localhost:3000    # local dev
```
