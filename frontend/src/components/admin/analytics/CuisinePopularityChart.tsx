"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CuisinePoint } from "@/types/admin";

interface CuisinePopularityChartProps {
  data: CuisinePoint[];
}

export function CuisinePopularityChart({ data }: CuisinePopularityChartProps) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis type="number" tick={{ fontSize: 12 }} />
        <YAxis
          type="category"
          dataKey="cuisine"
          width={100}
          tick={{ fontSize: 12 }}
        />
        <Tooltip />
        <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Bookings" />
      </BarChart>
    </ResponsiveContainer>
  );
}
