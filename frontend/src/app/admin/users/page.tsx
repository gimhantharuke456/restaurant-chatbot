import { Suspense } from "react";
import { serverFetch } from "@/lib/server/api";
import { PageHeader } from "@/components/admin/PageHeader";
import { UserTable } from "@/components/admin/UserTable";
import { UserRoleFilter } from "@/components/admin/UserRoleFilter";
import { PaginationBar } from "@/components/admin/PaginationBar";
import { AdminUser, PaginatedResponse } from "@/types/admin";

interface SearchParams {
  page?: string;
  role?: string;
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { page: pageParam, role } = await searchParams;
  const page = Number(pageParam ?? 1);
  const limit = 20;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(role ? { role } : {}),
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
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">Filter by role:</span>
          <Suspense>
            <UserRoleFilter currentRole={role} />
          </Suspense>
        </div>

        <UserTable users={result.data} />
        <Suspense>
          <PaginationBar page={page} total={result.total} limit={limit} />
        </Suspense>
      </div>
    </div>
  );
}
