import { serverFetch } from "@/lib/server/api";
import { requireRestaurantAdmin } from "@/lib/server/auth";

interface PortalStats {
  restaurantName: string;
  avgRating: number | null;
  totalReviews: number;
  totalReservations: number;
  activeReservations: number;
  pendingReservations: number;
  totalRevenue: number;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

export default async function RestaurantDashboard() {
  await requireRestaurantAdmin();
  const stats = await serverFetch<PortalStats>("restaurant-portal/stats").catch(() => null);
  if (!stats) {
    return (
      <div className="p-8 text-muted-foreground text-sm">
        Could not load dashboard. Make sure the backend is running and the restaurant account is seeded.
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{stats.restaurantName}</h1>
        <p className="text-sm text-muted-foreground mt-1">Restaurant dashboard</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total Reservations" value={stats.totalReservations} />
        <StatCard label="Active Reservations" value={stats.activeReservations} />
        <StatCard label="Pending Confirmation" value={stats.pendingReservations} />
        <StatCard label="Total Revenue (LKR)" value={stats.totalRevenue.toLocaleString()} />
        <StatCard
          label="Average Rating"
          value={stats.avgRating != null ? `${stats.avgRating.toFixed(1)} ⭐` : "No ratings yet"}
        />
        <StatCard label="Total Reviews" value={stats.totalReviews} />
      </div>
    </div>
  );
}
