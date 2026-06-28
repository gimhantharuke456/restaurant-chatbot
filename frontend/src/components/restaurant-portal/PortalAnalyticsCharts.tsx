"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, ResponsiveContainer,
} from "recharts";

interface PortalAnalytics {
  totalRevenue: number;
  peakHours: { time: string; count: number }[];
  topMenuItems: { name: string; count: number; revenue: number }[];
  statusBreakdown: { status: string; count: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "#3b82f6", PENDING: "#f59e0b", COMPLETED: "#10b981",
  CANCELLED: "#ef4444", NO_SHOW: "#6b7280",
};

export function PortalAnalyticsCharts({ analytics }: { analytics: PortalAnalytics }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {analytics.peakHours.length > 0 && (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Peak Booking Hours</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={analytics.peakHours.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Reservations" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {analytics.statusBreakdown.length > 0 && (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Reservation Status</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={analytics.statusBreakdown} dataKey="count" nameKey="status"
                cx="50%" cy="50%" outerRadius={80}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={false}>
                {analytics.statusBreakdown.map((e) => (
                  <Cell key={e.status} fill={STATUS_COLORS[e.status] ?? "#94a3b8"} />
                ))}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {analytics.topMenuItems.length > 0 && (
        <div className="rounded-xl border bg-card p-5 space-y-3 lg:col-span-2">
          <h2 className="text-sm font-semibold text-foreground">Top Menu Items (by orders)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={analytics.topMenuItems.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Orders" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
