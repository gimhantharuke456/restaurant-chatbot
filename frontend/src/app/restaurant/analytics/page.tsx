import { serverFetch } from "@/lib/server/api";
import { PortalAnalyticsCharts } from "@/components/restaurant-portal/PortalAnalyticsCharts";

interface PortalAnalytics {
  totalRevenue: number;
  peakHours: { time: string; count: number }[];
  topMenuItems: { name: string; count: number; revenue: number }[];
  statusBreakdown: { status: string; count: number }[];
}

export default async function PortalAnalyticsPage() {
  const analytics = await serverFetch<PortalAnalytics>(
    "restaurant-portal/analytics"
  ).catch(() => null);

  if (!analytics) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Analytics not available. Complete some reservations to see data.
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Total revenue: LKR {analytics.totalRevenue.toLocaleString()}
        </p>
      </div>
      <PortalAnalyticsCharts analytics={analytics} />
    </div>
  );
}
