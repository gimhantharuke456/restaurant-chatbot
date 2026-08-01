import { Suspense } from "react";
import { serverFetch } from "@/lib/server/api";
import { PageHeader } from "@/components/admin/PageHeader";
import { RestaurantTable } from "@/components/admin/RestaurantTable";
import { RestaurantFilters } from "@/components/admin/RestaurantFilters";
import { PaginationBar } from "@/components/admin/PaginationBar";
import { CreateRestaurantDialog } from "@/components/admin/CreateRestaurantDialog";
import { AdminRestaurant, PaginatedResponse } from "@/types/admin";

interface SearchParams {
  page?: string;
  search?: string;
  verified?: string;
  active?: string;
}

export default async function RestaurantsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { page: pageParam, search, verified, active } = await searchParams;
  const page = Number(pageParam ?? 1);
  const limit = 20;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(search ? { search } : {}),
    ...(verified ? { verified } : {}),
    ...(active ? { active } : {}),
  });

  const result = await serverFetch<PaginatedResponse<AdminRestaurant>>(
    `admin/restaurants?${params.toString()}`
  );

  return (
    <div>
      <PageHeader
        title="Restaurants"
        description={`${result.total} total restaurants`}
        actions={<CreateRestaurantDialog />}
      />

      <div className="space-y-4 p-8">
        <Suspense>
          <RestaurantFilters />
        </Suspense>
        <RestaurantTable restaurants={result.data} />
        <Suspense>
          <PaginationBar page={page} total={result.total} limit={limit} />
        </Suspense>
      </div>
    </div>
  );
}
