import { Suspense } from "react";
import { Star } from "lucide-react";
import { serverFetch } from "@/lib/server/api";
import { PaginationBar } from "@/components/admin/PaginationBar";
import { ReservationStatusSelect } from "@/components/restaurant-portal/ReservationStatusSelect";
import { ReservationCalendar } from "@/components/restaurant-portal/ReservationCalendar";

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
  category?: string;
}

interface Payment {
  orderItems: OrderItem[] | null;
  amount: number;
  status: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  imageUrls: string;
  createdAt: string;
}

interface Reservation {
  id: string;
  date: string;
  time: string;
  partySize: number;
  specialRequests: string | null;
  status: string;
  user: { name: string | null; email: string; phone: string | null };
  payment: Payment | null;
  review: Review | null;
}

interface PaginatedReservations {
  data: Reservation[];
  total: number;
  page: number;
  limit: number;
}

function ReviewCell({ review }: { review: Review | null }) {
  if (!review) return <span className="text-muted-foreground/60">—</span>;
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={`h-3 w-3 ${n <= review.rating ? "fill-amber-400 text-amber-400" : "fill-none text-muted-foreground/30"}`}
          />
        ))}
        <span className="text-xs text-muted-foreground ml-1">{review.rating}/5</span>
      </div>
      {review.comment && (
        <p className="text-xs text-muted-foreground max-w-[160px] truncate">{review.comment}</p>
      )}
    </div>
  );
}

interface SearchParams { page?: string; status?: string; view?: string }

function OrderCell({ payment }: { payment: Payment | null }) {
  if (!payment?.orderItems?.length) {
    return <span className="text-muted-foreground/60">—</span>;
  }
  const items = payment.orderItems;
  const preview = items.slice(0, 3);
  const rest = items.length - 3;
  return (
    <div className="space-y-0.5">
      {preview.map((item, i) => (
        <div key={i} className="text-xs">
          <span className="text-muted-foreground">{item.quantity}×</span>{" "}
          <span>{item.name}</span>
        </div>
      ))}
      {rest > 0 && (
        <div className="text-xs text-muted-foreground">+{rest} more</div>
      )}
      <div className="text-xs font-medium text-foreground pt-0.5">
        LKR {payment.amount.toLocaleString()}
      </div>
    </div>
  );
}

export default async function PortalReservationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { page: pageParam, status, view = "calendar" } = await searchParams;
  const page = Number(pageParam ?? 1);
  const limit = 25;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(status ? { status } : {}),
  });

  const result = await serverFetch<PaginatedReservations>(
    `restaurant-portal/reservations?${params.toString()}`
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Reservations</h1>
          <p className="text-sm text-muted-foreground mt-1">{result.total} total</p>
        </div>

        <div className="flex rounded-lg border bg-card overflow-hidden text-sm font-medium">
          <a
            href="?view=calendar"
            className={`px-4 py-2 transition-colors ${view === "calendar" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/40"}`}
          >
            Calendar
          </a>
          <a
            href="?view=list"
            className={`px-4 py-2 transition-colors ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/40"}`}
          >
            List
          </a>
        </div>
      </div>

      {view === "calendar" && <ReservationCalendar />}

      {view === "list" && (
        <>
          <div className="overflow-hidden rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Guest</th>
                  <th className="px-4 py-3 text-left font-medium">Date & Time</th>
                  <th className="px-4 py-3 text-left font-medium">Party</th>
                  <th className="px-4 py-3 text-left font-medium">Special Requests</th>
                  <th className="px-4 py-3 text-left font-medium">Pre-Order</th>
                  <th className="px-4 py-3 text-left font-medium">Review</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      No reservations found
                    </td>
                  </tr>
                ) : (
                  result.data.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{r.user.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{r.user.email}</div>
                        {r.user.phone && (
                          <div className="text-xs text-muted-foreground">{r.user.phone}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-foreground">{new Date(r.date).toLocaleDateString()}</div>
                        <div className="text-muted-foreground">{r.time}</div>
                      </td>
                      <td className="px-4 py-3 text-foreground">{r.partySize}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                        {r.specialRequests ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <OrderCell payment={r.payment} />
                      </td>
                      <td className="px-4 py-3">
                        <ReviewCell review={r.review} />
                      </td>
                      <td className="px-4 py-3">
                        <ReservationStatusSelect
                          reservationId={r.id}
                          currentStatus={r.status}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Suspense>
            <PaginationBar page={page} total={result.total} limit={limit} />
          </Suspense>
        </>
      )}
    </div>
  );
}
