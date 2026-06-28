import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

interface Reservation {
  id: string;
  user: { name: string | null; email: string };
  restaurant: { name: string };
  date: string;
  time: string;
  partySize: number;
  status: string;
}

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  CONFIRMED: "default",
  PENDING: "secondary",
  CANCELLED: "destructive",
  COMPLETED: "outline",
};

interface RecentReservationsProps {
  reservations: Reservation[];
}

export function RecentReservations({ reservations }: RecentReservationsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">
          Recent Reservations
        </CardTitle>
        <Link
          href="/admin/reservations"
          className="text-sm text-blue-600 hover:underline"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Guest</TableHead>
              <TableHead>Restaurant</TableHead>
              <TableHead>Date / Time</TableHead>
              <TableHead>Party</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reservations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No reservations yet
                </TableCell>
              </TableRow>
            ) : (
              reservations.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="text-sm font-medium">
                      {r.user.name ?? r.user.email}
                    </div>
                    <div className="text-xs text-muted-foreground">{r.user.email}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.restaurant.name}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(r.date).toLocaleDateString("en-LK")}{" "}
                    <span className="text-muted-foreground">{r.time}</span>
                  </TableCell>
                  <TableCell className="text-sm">{r.partySize}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[r.status] ?? "outline"}>
                      {r.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
