import { Suspense } from "react";
import { serverFetch } from "@/lib/server/api";
import { PageHeader } from "@/components/admin/PageHeader";
import { VerificationTable } from "@/components/admin/VerificationTable";
import { PaginationBar } from "@/components/admin/PaginationBar";
import { AdminRestaurant, PaginatedResponse } from "@/types/admin";

interface SearchParams {
  page?: string;
}

export default async function VerificationPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Number(pageParam ?? 1);
  const limit = 20;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    verified: "false",
    active: "true",
  });

  const result = await serverFetch<PaginatedResponse<AdminRestaurant>>(
    `admin/restaurants?${params.toString()}`
  );

  return (
    <div>
      <PageHeader
        title="Pending Verification"
        description={`${result.total} restaurant${result.total !== 1 ? "s" : ""} awaiting verification`}
      />

      <div className="space-y-4 p-8">
        <VerificationTable restaurants={result.data} />
        <Suspense>
          <PaginationBar page={page} total={result.total} limit={limit} />
        </Suspense>
      </div>
    </div>
  );
}
