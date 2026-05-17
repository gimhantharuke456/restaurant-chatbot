import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AdminReservation } from "@/types/admin";
import { ReservationStatusButton } from "./ReservationStatusButton";

interface ReservationAdminTableProps {
  reservations: AdminReservation[];
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

export function ReservationAdminTable({
  reservations,
}: ReservationAdminTableProps) {
  if (reservations.length === 0) {
    return (
      <div className="rounded-lg border bg-white py-16 text-center text-slate-400">
        No reservations found
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead>Guest</TableHead>
            <TableHead>Restaurant</TableHead>
            <TableHead>Date / Time</TableHead>
            <TableHead>Party</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Change Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reservations.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <div className="text-sm font-medium">
                  {r.user.name ?? r.user.email}
                </div>
                <div className="text-xs text-slate-400">{r.user.email}</div>
              </TableCell>
              <TableCell>
                <div className="text-sm font-medium">{r.restaurant.name}</div>
                <div className="text-xs text-slate-400">{r.restaurant.area}</div>
              </TableCell>
              <TableCell className="text-sm">
                {new Date(r.date).toLocaleDateString("en-LK")}{" "}
                <span className="text-slate-400">{r.time}</span>
              </TableCell>
              <TableCell className="text-sm">{r.partySize}</TableCell>
              <TableCell>
                {r.payment ? (
                  <div className="text-sm">
                    <div className="font-medium">
                      LKR {r.payment.amount.toLocaleString()}
                    </div>
                    <Badge
                      variant={
                        r.payment.status === "SUCCEEDED" ? "default" : "secondary"
                      }
                      className="text-xs"
                    >
                      {r.payment.status}
                    </Badge>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">Unpaid</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[r.status] ?? "outline"}>
                  {r.status}
                </Badge>
              </TableCell>
              <TableCell>
                <ReservationStatusButton
                  reservationId={r.id}
                  currentStatus={r.status}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
