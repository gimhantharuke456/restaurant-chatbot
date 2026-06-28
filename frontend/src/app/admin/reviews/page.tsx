import { Suspense } from "react";
import { serverFetch } from "@/lib/server/api";
import { requireAdmin } from "@/lib/server/auth";
import { PageHeader } from "@/components/admin/PageHeader";
import { PaginationBar } from "@/components/admin/PaginationBar";
import { AdminReviewsTable } from "@/components/admin/AdminReviewsTable";
import { AdminReviewFull, PaginatedResponse } from "@/types/admin";

interface SearchParams {
  page?: string;
  rating?: string;
  visible?: string;
}

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  const { page: pageParam, rating, visible } = await searchParams;
  const page = Number(pageParam ?? 1);
  const limit = 25;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(rating ? { rating } : {}),
    ...(visible !== undefined ? { isVisible: visible } : {}),
  });

  const result = await serverFetch<PaginatedResponse<AdminReviewFull>>(
    `admin/reviews?${params.toString()}`
  );

  return (
    <div>
      <PageHeader
        title="Reviews"
        description={`${result.total} total reviews`}
      />
      <div className="space-y-4 p-8">
        <AdminReviewsTable reviews={result.data} />
        <Suspense>
          <PaginationBar page={page} total={result.total} limit={limit} />
        </Suspense>
      </div>
    </div>
  );
}
