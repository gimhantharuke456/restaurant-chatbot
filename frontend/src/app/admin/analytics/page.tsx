import { serverFetch } from "@/lib/server/api";
import { PageHeader } from "@/components/admin/PageHeader";
import { ChartCard } from "@/components/admin/analytics/ChartCard";
import { ReservationsTrendChart } from "@/components/admin/analytics/ReservationsTrendChart";
import { RevenueTrendChart } from "@/components/admin/analytics/RevenueTrendChart";
import { CuisinePopularityChart } from "@/components/admin/analytics/CuisinePopularityChart";
import { UserGrowthChart } from "@/components/admin/analytics/UserGrowthChart";
import { ReservationStatusPieChart } from "@/components/admin/analytics/ReservationStatusPieChart";
import { TimeSeriesPoint, CuisinePoint, StatusPoint } from "@/types/admin";

export default async function AnalyticsPage() {
  const [
    reservationsTrend,
    revenueTrend,
    cuisinePopularity,
    userGrowth,
    reservationStatus,
  ] = await Promise.all([
    serverFetch<TimeSeriesPoint[]>("admin/analytics/reservations"),
    serverFetch<TimeSeriesPoint[]>("admin/analytics/revenue"),
    serverFetch<CuisinePoint[]>("admin/analytics/cuisines"),
    serverFetch<TimeSeriesPoint[]>("admin/analytics/users"),
    serverFetch<StatusPoint[]>("admin/analytics/reservation-status"),
  ]);

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="System performance and usage trends"
      />

      <div className="grid gap-6 p-8 md:grid-cols-2">
        <ChartCard
          title="Reservations Over Time"
          description="Daily reservation counts (last 30 days)"
        >
          <ReservationsTrendChart data={reservationsTrend} />
        </ChartCard>

        <ChartCard
          title="Revenue Over Time"
          description="Daily revenue in LKR (last 30 days)"
        >
          <RevenueTrendChart data={revenueTrend} />
        </ChartCard>

        <ChartCard
          title="Popular Cuisines"
          description="Reservation count by cuisine type"
        >
          <CuisinePopularityChart data={cuisinePopularity} />
        </ChartCard>

        <ChartCard
          title="User Growth"
          description="New user registrations (last 30 days)"
        >
          <UserGrowthChart data={userGrowth} />
        </ChartCard>

        <ChartCard
          title="Reservation Status Breakdown"
          description="Distribution across all statuses"
        >
          <ReservationStatusPieChart data={reservationStatus} />
        </ChartCard>
      </div>
    </div>
  );
}
