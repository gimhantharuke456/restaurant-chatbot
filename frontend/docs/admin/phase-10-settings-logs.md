# Phase 10: Settings & Audit Logs

## Goal
Two final pages:
1. `/admin/settings` — SSR form to manage system-level config (email templates, feature flags, ngrok URL visibility)
2. `/admin/logs` — SSR table of the last N admin actions (who changed what, when) with search and export

## Architecture
```
/admin/settings/page.tsx                  — SSR, fetches current settings
/admin/logs/page.tsx                      — SSR, fetches audit log
components/admin/
  SettingsForm.tsx                        — CSR form, PATCHes settings via proxy
  AuditLogTable.tsx                       — Static server-rendered log table
  ExportLogsButton.tsx                    — CSR button to download logs as CSV
```

## shadcn Components to Install

```bash
npx shadcn-ui@latest add switch separator
```

---

## Files

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/app/admin/settings/page.tsx` | SSR settings loader |
| Create | `src/app/admin/logs/page.tsx` | SSR audit log |
| Create | `src/components/admin/SettingsForm.tsx` | CSR settings editor |
| Create | `src/components/admin/AuditLogTable.tsx` | Log display table |
| Create | `src/components/admin/ExportLogsButton.tsx` | CSV download |
| Modify | `src/types/admin.ts` | Add SystemSettings, AuditLog types |

---

## Backend Endpoints Used

| Endpoint | Method | Response |
|----------|--------|----------|
| `GET /api/admin/settings` | GET | `SystemSettings` |
| `PATCH /api/admin/settings` | PATCH | Updated settings |
| `GET /api/admin/logs` | GET | `AuditLog[]` with `limit`, `search` |

---

## Types (add to `src/types/admin.ts`)

```typescript
export interface SystemSettings {
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  maxReservationsPerDay: number;
  supportEmail: string;
  ngrokUrl: string | null;
}

export interface AuditLog {
  id: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string | null;
  details: string | null;
  createdAt: string;
  ipAddress: string | null;
}
```

---

## Tasks

### Task 10.1 — SettingsForm component

Create `src/components/admin/SettingsForm.tsx`:

```typescript
"use client";

import { useState } from "react";
import { SystemSettings } from "@/types/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface SettingsFormProps {
  settings: SystemSettings;
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const [form, setForm] = useState<SystemSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const updateField = <K extends keyof SystemSettings>(
    key: K,
    value: SystemSettings[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/proxy/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">System Flags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Maintenance Mode</Label>
              <p className="text-xs text-slate-400">
                Blocks all non-admin traffic
              </p>
            </div>
            <Switch
              checked={form.maintenanceMode}
              onCheckedChange={(v) => updateField("maintenanceMode", v)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">
                User Registration
              </Label>
              <p className="text-xs text-slate-400">
                Allow new users to sign up
              </p>
            </div>
            <Switch
              checked={form.registrationEnabled}
              onCheckedChange={(v) => updateField("registrationEnabled", v)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="maxReservations">
              Max Reservations Per Day (system-wide)
            </Label>
            <Input
              id="maxReservations"
              type="number"
              min={1}
              value={form.maxReservationsPerDay}
              onChange={(e) =>
                updateField(
                  "maxReservationsPerDay",
                  Number(e.target.value)
                )
              }
              className="w-48"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supportEmail">Support Email</Label>
            <Input
              id="supportEmail"
              type="email"
              value={form.supportEmail}
              onChange={(e) => updateField("supportEmail", e.target.value)}
              className="w-80"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ngrokUrl">ngrok Public URL</Label>
            <Input
              id="ngrokUrl"
              placeholder="https://xxxx.ngrok-free.app"
              value={form.ngrokUrl ?? ""}
              onChange={(e) => updateField("ngrokUrl", e.target.value || null)}
              className="w-80"
            />
            <p className="text-xs text-slate-400">
              Used as Stripe webhook endpoint. Check ngrok dashboard at
              localhost:4040.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Settings"}
        </Button>
        {saved && (
          <span className="text-sm text-green-600">Settings saved!</span>
        )}
      </div>
    </div>
  );
}
```

---

### Task 10.2 — Settings page (SSR)

Create `src/app/admin/settings/page.tsx`:

```typescript
import { serverFetch } from "@/lib/server/api";
import { PageHeader } from "@/components/admin/PageHeader";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { SystemSettings } from "@/types/admin";

export default async function SettingsPage() {
  const settings = await serverFetch<SystemSettings>("admin/settings");

  return (
    <div>
      <PageHeader
        title="Settings"
        description="System-level configuration"
      />

      <div className="p-8 max-w-2xl">
        <SettingsForm settings={settings} />
      </div>
    </div>
  );
}
```

---

### Task 10.3 — ExportLogsButton component

Create `src/components/admin/ExportLogsButton.tsx`:

```typescript
"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { AuditLog } from "@/types/admin";

interface ExportLogsButtonProps {
  logs: AuditLog[];
}

export function ExportLogsButton({ logs }: ExportLogsButtonProps) {
  const handleExport = () => {
    const headers = [
      "Date",
      "Admin",
      "Action",
      "Target Type",
      "Target ID",
      "Details",
      "IP",
    ];

    const rows = logs.map((log) => [
      new Date(log.createdAt).toISOString(),
      log.adminEmail,
      log.action,
      log.targetType,
      log.targetId ?? "",
      log.details ?? "",
      log.ipAddress ?? "",
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admin-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" onClick={handleExport}>
      <Download className="mr-2 h-4 w-4" />
      Export CSV
    </Button>
  );
}
```

---

### Task 10.4 — AuditLogTable component

Create `src/components/admin/AuditLogTable.tsx`:

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
import { AuditLog } from "@/types/admin";

interface AuditLogTableProps {
  logs: AuditLog[];
}

const ACTION_BADGE: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  VERIFY: "default",
  UPDATE: "secondary",
  DELETE: "destructive",
  ROLE_CHANGE: "outline",
  TOGGLE: "secondary",
  REFUND: "destructive",
  SETTINGS_UPDATE: "secondary",
};

export function AuditLogTable({ logs }: AuditLogTableProps) {
  if (logs.length === 0) {
    return (
      <div className="rounded-lg border bg-white py-16 text-center text-slate-400">
        No audit logs yet
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead>Date & Time</TableHead>
            <TableHead>Admin</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Target</TableHead>
            <TableHead>Details</TableHead>
            <TableHead>IP</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="text-sm text-slate-500 whitespace-nowrap">
                {new Date(log.createdAt).toLocaleString("en-LK")}
              </TableCell>
              <TableCell className="text-sm">{log.adminEmail}</TableCell>
              <TableCell>
                <Badge variant={ACTION_BADGE[log.action] ?? "outline"}>
                  {log.action}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">
                <span className="font-medium">{log.targetType}</span>
                {log.targetId && (
                  <code className="ml-2 rounded bg-slate-100 px-1 text-xs text-slate-500">
                    {log.targetId.slice(0, 8)}…
                  </code>
                )}
              </TableCell>
              <TableCell className="max-w-xs text-sm text-slate-500">
                {log.details ?? "—"}
              </TableCell>
              <TableCell className="text-xs text-slate-400">
                {log.ipAddress ?? "—"}
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

### Task 10.5 — Audit log search filter (CSR)

Create `src/components/admin/LogSearchFilter.tsx`:

```typescript
"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function LogSearchFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSearch = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        placeholder="Search by action or admin email…"
        defaultValue={searchParams.get("search") ?? ""}
        className="pl-9 w-80"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleSearch((e.target as HTMLInputElement).value);
          }
        }}
      />
    </div>
  );
}
```

---

### Task 10.6 — Audit logs page (SSR)

Create `src/app/admin/logs/page.tsx`:

```typescript
import { serverFetch } from "@/lib/server/api";
import { PageHeader } from "@/components/admin/PageHeader";
import { AuditLogTable } from "@/components/admin/AuditLogTable";
import { ExportLogsButton } from "@/components/admin/ExportLogsButton";
import { LogSearchFilter } from "@/components/admin/LogSearchFilter";
import { PaginationBar } from "@/components/admin/PaginationBar";
import { AuditLog } from "@/types/admin";

interface PaginatedLogs {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
}

interface SearchParams {
  page?: string;
  search?: string;
}

export default async function LogsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const page = Number(searchParams.page ?? 1);
  const limit = 50;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(searchParams.search ? { search: searchParams.search } : {}),
  });

  const result = await serverFetch<PaginatedLogs>(
    `admin/logs?${params.toString()}`
  );

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description={`${result.total} total events`}
        actions={<ExportLogsButton logs={result.data} />}
      />

      <div className="space-y-4 p-8">
        <LogSearchFilter />
        <AuditLogTable logs={result.data} />
        <PaginationBar page={page} total={result.total} limit={limit} />
      </div>
    </div>
  );
}
```

---

### Task 10.7 — Backend: log admin actions middleware

> **Note:** The backend needs to record admin actions to the audit log. Add a logging helper to `backend/src/modules/admin/admin.service.ts`:

```typescript
// In backend/src/modules/admin/admin.service.ts
export async function logAdminAction(
  prisma: PrismaClient,
  adminId: string,
  adminEmail: string,
  action: string,
  targetType: string,
  targetId?: string,
  details?: string,
  ipAddress?: string
) {
  await prisma.adminLog.create({
    data: {
      adminId,
      adminEmail,
      action,
      targetType,
      targetId,
      details,
      ipAddress,
    },
  });
}
```

> The `AdminLog` model needs adding to `backend/prisma/schema.prisma`:

```prisma
model AdminLog {
  id          String   @id @default(uuid())
  adminId     String
  adminEmail  String
  action      String
  targetType  String
  targetId    String?
  details     String?
  ipAddress   String?
  createdAt   DateTime @default(now())

  @@index([createdAt])
  @@index([adminEmail])
}
```

> Run `npx prisma migrate dev --name add_admin_log` in backend.

---

### Commit

```bash
git add src/app/admin/settings/page.tsx \
        src/app/admin/logs/page.tsx \
        src/components/admin/SettingsForm.tsx \
        src/components/admin/AuditLogTable.tsx \
        src/components/admin/ExportLogsButton.tsx \
        src/components/admin/LogSearchFilter.tsx
git commit -m "feat(admin): settings page and audit log with CSV export"
```

---

## Final Wiring Checklist

After all 10 phases are implemented, verify:

```
LAYOUT & AUTH
[ ] /admin redirects unauthenticated users to /
[ ] /admin redirects non-SYSTEM_ADMIN users to /
[ ] Sidebar highlights active page
[ ] Logout clears cookie + Firebase session

PROXY
[ ] /api/proxy/* forwards to backend with Authorization header
[ ] 401 from backend returns 401 from proxy
[ ] PATCH/POST/DELETE methods all work

PAGES (SSR check — disable JS in browser, content must still render)
[ ] Dashboard: stats visible without JS
[ ] Restaurants: table visible without JS
[ ] Verification queue: list visible without JS
[ ] Users: table visible without JS
[ ] Reservations: table visible without JS
[ ] Payments: table + summary visible without JS
[ ] Analytics: page renders (charts blank without JS — expected)
[ ] Settings: form populated without JS
[ ] Logs: table visible without JS

INTERACTIONS (require JS)
[ ] Restaurant toggle works
[ ] Verify/reject restaurant works
[ ] User role change with confirmation works
[ ] Reservation status update works
[ ] Refund with confirmation works
[ ] Settings save works
[ ] Export logs downloads CSV

PAGINATION
[ ] PaginationBar updates URL and re-fetches
[ ] All list pages respect page= searchParam

FILTERS
[ ] Restaurant filters update URL and SSR re-fetches
[ ] User role filter works
[ ] Reservation status + date filter works
[ ] Payment status filter works
[ ] Log search works
```
