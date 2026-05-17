import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AdminUserDetail } from "@/types/admin";

interface UserReservationHistoryProps {
  reservations: AdminUserDetail["reservations"];
}

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  CONFIRMED: "default",
  PENDING: "secondary",
  CANCELLED: "destructive",
  COMPLETED: "outline",
  NO_SHOW: "destructive",
};

export function UserReservationHistory({
  reservations,
}: UserReservationHistoryProps) {
  if (reservations.length === 0) {
    return (
      <p className="py-8 text-center text-slate-400">No reservations yet</p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead>Restaurant</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reservations.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">
                {r.restaurant.name}
              </TableCell>
              <TableCell className="text-sm">
                {new Date(r.date).toLocaleDateString("en-LK")}
              </TableCell>
              <TableCell className="text-sm">{r.time}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[r.status] ?? "outline"}>
                  {r.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
