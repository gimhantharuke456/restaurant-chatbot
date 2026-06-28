import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { AdminPayment } from "@/types/admin";
import { RefundButton } from "./RefundButton";

interface PaymentTableProps {
  payments: AdminPayment[];
}

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  SUCCEEDED: "default",
  PENDING: "secondary",
  FAILED: "destructive",
  REFUNDED: "outline",
};

export function PaymentTable({ payments }: PaymentTableProps) {
  if (payments.length === 0) {
    return (
      <div className="rounded-lg border bg-card py-16 text-center text-muted-foreground">
        No payments found
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>User</TableHead>
            <TableHead>Restaurant</TableHead>
            <TableHead>Reservation</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Stripe ID</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                <div className="text-sm font-medium">
                  {p.user.name ?? p.user.email}
                </div>
                <div className="text-xs text-muted-foreground">{p.user.email}</div>
              </TableCell>
              <TableCell className="text-sm">
                {p.reservation.restaurant.name}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(p.reservation.date).toLocaleDateString("en-LK")}{" "}
                {p.reservation.time}
              </TableCell>
              <TableCell className="font-medium">
                {p.currency} {p.amount.toLocaleString()}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[p.status] ?? "outline"}>
                  {p.status}
                </Badge>
              </TableCell>
              <TableCell>
                {p.stripePaymentId ? (
                  <code className="rounded bg-muted px-1 text-xs">
                    {p.stripePaymentId.slice(0, 14)}…
                  </code>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(p.createdAt).toLocaleDateString("en-LK")}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {p.receiptUrl && (
                    <a
                      href={p.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                  <RefundButton
                    paymentId={p.id}
                    amount={p.amount}
                    currency={p.currency}
                    initialStatus={p.status}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
