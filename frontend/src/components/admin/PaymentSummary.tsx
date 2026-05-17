import { StatCard } from "./StatCard";
import { StatGrid } from "./StatGrid";
import { PaymentSummaryStats } from "@/types/admin";
import { DollarSign, CheckCircle2, XCircle, RotateCcw } from "lucide-react";

interface PaymentSummaryProps {
  stats: PaymentSummaryStats;
}

export function PaymentSummary({ stats }: PaymentSummaryProps) {
  return (
    <StatGrid>
      <StatCard
        label="Total Revenue"
        value={`LKR ${stats.totalRevenue.toLocaleString()}`}
        icon={DollarSign}
        accent="green"
      />
      <StatCard
        label="Succeeded Payments"
        value={stats.succeeded}
        icon={CheckCircle2}
        accent="green"
      />
      <StatCard
        label="Failed Payments"
        value={stats.failed}
        icon={XCircle}
        accent={stats.failed > 0 ? "red" : "default"}
      />
      <StatCard
        label="Refunded"
        value={stats.refunded}
        icon={RotateCcw}
        accent="orange"
      />
    </StatGrid>
  );
}
