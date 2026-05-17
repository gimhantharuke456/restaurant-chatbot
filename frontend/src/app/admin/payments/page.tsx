import { Suspense } from "react";
import { serverFetch } from "@/lib/server/api";
import { PageHeader } from "@/components/admin/PageHeader";
import { PaymentTable } from "@/components/admin/PaymentTable";
import { PaymentSummary } from "@/components/admin/PaymentSummary";
import { PaymentStatusFilter } from "@/components/admin/PaymentStatusFilter";
import { PaginationBar } from "@/components/admin/PaginationBar";
import {
  AdminPayment,
  PaginatedResponse,
  PaymentSummaryStats,
} from "@/types/admin";

interface SearchParams {
  page?: string;
  status?: string;
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { page: pageParam, status } = await searchParams;
  const page = Number(pageParam ?? 1);
  const limit = 25;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(status ? { status } : {}),
  });

  const [result, summary] = await Promise.all([
    serverFetch<PaginatedResponse<AdminPayment>>(
      `admin/payments?${params.toString()}`
    ),
    serverFetch<PaymentSummaryStats>("admin/payments/summary"),
  ]);

  return (
    <div>
      <PageHeader
        title="Payments"
        description={`${result.total} payment records`}
      />

      <div className="space-y-6 p-8">
        <PaymentSummary stats={summary} />

        <div className="flex items-center gap-3">
          <Suspense>
            <PaymentStatusFilter currentStatus={status} />
          </Suspense>
        </div>

        <PaymentTable payments={result.data} />
        <Suspense>
          <PaginationBar page={page} total={result.total} limit={limit} />
        </Suspense>
      </div>
    </div>
  );
}
