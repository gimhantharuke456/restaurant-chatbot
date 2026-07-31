import { serverFetch } from "@/lib/server/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Clock, Users, MapPin, ExternalLink, CreditCard, UtensilsCrossed } from "lucide-react";

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
  category?: string;
}

interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receiptUrl: string | null;
  orderItems: OrderItem[] | null;
  createdAt: string;
  reservation: {
    id: string;
    date: string;
    time: string;
    partySize: number;
    restaurant: { name: string; address: string; area: string };
  };
}

const STATUS_STYLES: Record<string, string> = {
  SUCCEEDED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  PENDING:   "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  FAILED:    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  REFUNDED:  "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

export default async function PaymentsPage() {
  const payments = await serverFetch<PaymentRecord[]>("payments/history").catch(() => []);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <CreditCard className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold">Payment History</h1>
        </div>

        {payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <CreditCard className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-medium">No payments yet</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Your payment history will appear here after you book a table and complete a payment.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((p) => {
              const dateLabel = new Date(p.reservation.date).toLocaleDateString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "long",
                year: "numeric",
              });
              const paidAt = new Date(p.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });

              return (
                <Card key={p.id}>
                  <CardContent className="p-4 space-y-3">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {p.reservation.restaurant.name}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {p.reservation.restaurant.area}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[p.status] ?? "bg-muted text-foreground"}`}
                        >
                          {p.status}
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          {p.currency} {p.amount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Reservation details */}
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" /> {dateLabel}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {p.reservation.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {p.reservation.partySize}{" "}
                        {p.reservation.partySize === 1 ? "person" : "people"}
                      </span>
                    </div>

                    {/* Order items */}
                    {p.orderItems && p.orderItems.length > 0 && (
                      <div className="rounded-md bg-muted/40 border border-border px-3 py-2 space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <UtensilsCrossed className="h-3 w-3" /> Pre-ordered items
                        </p>
                        {p.orderItems.map((item, i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span className="text-foreground">
                              {item.quantity}× {item.name}
                            </span>
                            <span className="text-muted-foreground">
                              {p.currency} {(item.price * item.quantity).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Footer row */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-0.5">
                      <span>Paid on {paidAt}</span>
                      {p.receiptUrl && (
                        <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                          <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                            Receipt
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
