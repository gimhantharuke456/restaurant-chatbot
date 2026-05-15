import { serverFetch } from "@/lib/server/api";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { StatGrid } from "@/components/admin/StatGrid";
import { DashboardAlerts } from "@/components/admin/DashboardAlerts";
import { RecentReservations } from "@/components/admin/RecentReservations";
import {
  Users,
  Building2,
  CalendarDays,
  CreditCard,
  DollarSign,
  AlertCircle,
} from "lucide-react";

interface AdminStats {
  totalUsers: number;
  totalRestaurants: number;
  activeReservations: number;
  totalRevenue: number;
  totalPayments: number;
  verificationPending: number;
}

interface RecentReservation {
  id: string;
  user: { name: string | null; email: string };
  restaurant: { name: string };
  date: string;
  time: string;
  partySize: number;
  status: string;
}

export default async function AdminDashboardPage() {
  const [stats, recentRes] = await Promise.all([
    serverFetch<AdminStats>("admin/stats"),
    serverFetch<RecentReservation[]>("admin/reservations?limit=5&sort=recent").catch(
      () => []
    ),
  ]);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="System overview for Restaurant Chatbot"
      />

      <div className="space-y-6 p-8">
        <DashboardAlerts verificationPending={stats.verificationPending} />

        <StatGrid>
          <StatCard
            label="Total Users"
            value={stats.totalUsers.toLocaleString()}
            icon={Users}
            accent="blue"
          />
          <StatCard
            label="Total Restaurants"
            value={stats.totalRestaurants.toLocaleString()}
            icon={Building2}
          />
          <StatCard
            label="Active Reservations"
            value={stats.activeReservations.toLocaleString()}
            icon={CalendarDays}
            accent="green"
          />
          <StatCard
            label="Total Revenue"
            value={`LKR ${stats.totalRevenue.toLocaleString()}`}
            icon={DollarSign}
            accent="green"
          />
          <StatCard
            label="Total Payments"
            value={stats.totalPayments.toLocaleString()}
            icon={CreditCard}
          />
          <StatCard
            label="Pending Verification"
            value={stats.verificationPending}
            icon={AlertCircle}
            accent={stats.verificationPending > 0 ? "orange" : "default"}
          />
        </StatGrid>

        <RecentReservations reservations={recentRes} />
      </div>
    </div>
  );
}
