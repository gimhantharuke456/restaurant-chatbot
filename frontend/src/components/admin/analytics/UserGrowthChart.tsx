"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TimeSeriesPoint } from "@/types/admin";

interface UserGrowthChartProps {
  data: TimeSeriesPoint[];
}

export function UserGrowthChart({ data }: UserGrowthChartProps) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          tickFormatter={(v) =>
            new Date(v).toLocaleDateString("en-LK", {
              month: "short",
              day: "numeric",
            })
          }
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          labelFormatter={(v) => new Date(v).toLocaleDateString("en-LK")}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={false}
          name="New Users"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
