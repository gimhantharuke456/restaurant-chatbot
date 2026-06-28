import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: string; up: boolean };
  accent?: "default" | "green" | "orange" | "red" | "blue";
}

const ACCENT_CLASSES = {
  default: "bg-muted text-muted-foreground",
  green:   "bg-green-100 text-green-700",
  orange:  "bg-orange-100 text-orange-700",
  red:     "bg-red-100 text-red-700",
  blue:    "bg-blue-100 text-blue-700",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  accent = "default",
}: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between p-6">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold tracking-tight text-foreground">
            {value}
          </p>
          {trend && (
            <p
              className={cn(
                "text-xs font-medium",
                trend.up ? "text-green-600" : "text-red-600"
              )}
            >
              {trend.up ? "↑" : "↓"} {trend.value}
            </p>
          )}
        </div>
        <div className={cn("rounded-lg p-3", ACCENT_CLASSES[accent])}>
          <Icon className="h-6 w-6" />
        </div>
      </CardContent>
    </Card>
  );
}
