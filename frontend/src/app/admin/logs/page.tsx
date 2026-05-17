import { Suspense } from "react";
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
  searchParams: Promise<SearchParams>;
}) {
  const { page: pageParam, search } = await searchParams;
  const page = Number(pageParam ?? 1);
  const limit = 50;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(search ? { search } : {}),
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
        <Suspense>
          <LogSearchFilter />
        </Suspense>
        <AuditLogTable logs={result.data} />
        <Suspense>
          <PaginationBar page={page} total={result.total} limit={limit} />
        </Suspense>
      </div>
    </div>
  );
}
