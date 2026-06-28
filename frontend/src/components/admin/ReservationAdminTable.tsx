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
import { Star } from "lucide-react";

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

function ReviewCell({ review }: { review: AdminReservation["review"] }) {
  if (!review) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={`h-3.5 w-3.5 ${n <= review.rating ? "fill-amber-400 text-amber-400" : "fill-none text-muted-foreground/30"}`}
          />
        ))}
        <span className="text-xs text-muted-foreground ml-1">({review.rating}/5)</span>
      </div>
      {review.comment && (
        <p className="text-xs text-muted-foreground max-w-[180px] truncate">{review.comment}</p>
      )}
    </div>
  );
}

export function ReservationAdminTable({
  reservations,
}: ReservationAdminTableProps) {
  if (reservations.length === 0) {
    return (
      <div className="rounded-lg border bg-card py-16 text-center text-muted-foreground">
        No reservations found
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Guest</TableHead>
            <TableHead>Restaurant</TableHead>
            <TableHead>Date / Time</TableHead>
            <TableHead>Party</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Review</TableHead>
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
                <div className="text-xs text-muted-foreground">{r.user.email}</div>
              </TableCell>
              <TableCell>
                <div className="text-sm font-medium">{r.restaurant.name}</div>
                <div className="text-xs text-muted-foreground">{r.restaurant.area}</div>
              </TableCell>
              <TableCell className="text-sm">
                {new Date(r.date).toLocaleDateString("en-LK")}{" "}
                <span className="text-muted-foreground">{r.time}</span>
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
                  <span className="text-xs text-muted-foreground">Unpaid</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[r.status] ?? "outline"}>
                  {r.status}
                </Badge>
              </TableCell>
              <TableCell>
                <ReviewCell review={r.review} />
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
