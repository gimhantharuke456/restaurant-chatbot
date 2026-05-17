import { Suspense } from "react";
import { serverFetch } from "@/lib/server/api";
import { PageHeader } from "@/components/admin/PageHeader";
import { ReservationAdminTable } from "@/components/admin/ReservationAdminTable";
import { ReservationStatusFilter } from "@/components/admin/ReservationStatusFilter";
import { DateRangeFilter } from "@/components/admin/DateRangeFilter";
import { PaginationBar } from "@/components/admin/PaginationBar";
import { AdminReservation, PaginatedResponse } from "@/types/admin";

interface SearchParams {
  page?: string;
  status?: string;
  from?: string;
  to?: string;
}

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { page: pageParam, status, from, to } = await searchParams;
  const page = Number(pageParam ?? 1);
  const limit = 25;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(status ? { status } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  });

  const result = await serverFetch<PaginatedResponse<AdminReservation>>(
    `admin/reservations?${params.toString()}`
  );

  return (
    <div>
      <PageHeader
        title="Reservations"
        description={`${result.total} total reservations`}
      />

      <div className="space-y-4 p-8">
        <div className="flex flex-wrap items-end gap-4">
          <Suspense>
            <ReservationStatusFilter currentStatus={status} />
          </Suspense>
          <Suspense>
            <DateRangeFilter />
          </Suspense>
        </div>

        <ReservationAdminTable reservations={result.data} />
        <Suspense>
          <PaginationBar page={page} total={result.total} limit={limit} />
        </Suspense>
      </div>
    </div>
  );
}
