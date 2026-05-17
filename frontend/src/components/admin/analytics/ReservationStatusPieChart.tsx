"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { StatusPoint } from "@/types/admin";

interface ReservationStatusPieChartProps {
  data: StatusPoint[];
}

const COLORS: Record<string, string> = {
  CONFIRMED: "#3b82f6",
  PENDING: "#f59e0b",
  COMPLETED: "#10b981",
  CANCELLED: "#ef4444",
  NO_SHOW: "#6b7280",
};

export function ReservationStatusPieChart({
  data,
}: ReservationStatusPieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="status"
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={({ name, percent }) =>
            `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
          }
          labelLine={false}
        >
          {data.map((entry) => (
            <Cell
              key={entry.status}
              fill={COLORS[entry.status] ?? "#94a3b8"}
            />
          ))}
        </Pie>
        <Tooltip formatter={(v) => [v, "Reservations"]} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
