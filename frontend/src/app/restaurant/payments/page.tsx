import { Suspense } from "react";
import { serverFetch } from "@/lib/server/api";
import { Badge } from "@/components/ui/badge";
import { PaginationBar } from "@/components/admin/PaginationBar";
import { PaymentStatusButton } from "@/components/restaurant-portal/PaymentStatusButton";

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receiptUrl: string | null;
  orderItems: OrderItem[] | null;
  createdAt: string;
  user: { name: string | null; email: string };
  reservation: { id: string; date: string; time: string; partySize: number };
}

interface PaginatedPayments {
  data: Payment[];
  total: number;
  page: number;
  limit: number;
}

interface SearchParams { page?: string; status?: string }

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  SUCCEEDED: "default",
  PENDING:   "secondary",
  FAILED:    "destructive",
  REFUNDED:  "outline",
};

const STATUS_OPTIONS = ["PENDING", "SUCCEEDED", "FAILED", "REFUNDED"];

function OrderItemsCell({ items, amount }: { items: OrderItem[] | null; amount: number }) {
  if (!items?.length) return <span className="text-muted-foreground/60">—</span>;
  const preview = items.slice(0, 2);
  const rest = items.length - 2;
  return (
    <div className="space-y-0.5">
      {preview.map((item, i) => (
        <div key={i} className="text-xs">
          <span className="text-muted-foreground">{item.quantity}×</span>{" "}
          <span className="text-foreground">{item.name}</span>
        </div>
      ))}
      {rest > 0 && <div className="text-xs text-muted-foreground">+{rest} more</div>}
      <div className="text-xs font-semibold text-foreground pt-0.5">
        LKR {amount.toLocaleString()}
      </div>
    </div>
  );
}

export default async function PortalPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { page: pageParam, status } = await searchParams;
  const page = Number(pageParam ?? 1);
  const limit = 25;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(status ? { status } : {}),
  });

  const result = await serverFetch<PaginatedPayments>(
    `restaurant-portal/payments?${params.toString()}`
  );

  const totalRevenue = result.data
    .filter((p) => p.status === "SUCCEEDED")
    .reduce((s, p) => s + p.amount, 0);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Payments</h1>
          <p className="text-sm text-muted-foreground mt-1">{result.total} total</p>
        </div>
        {totalRevenue > 0 && (
          <div className="rounded-lg border border-border bg-card px-4 py-2 text-right">
            <p className="text-xs text-muted-foreground">Confirmed revenue (this page)</p>
            <p className="text-lg font-bold text-foreground">LKR {totalRevenue.toLocaleString()}</p>
          </div>
        )}
      </div>

      {/* Status filter */}
      <Suspense>
        <div className="flex flex-wrap gap-2">
          <a
            href="?page=1"
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              !status
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
          >
            All
          </a>
          {STATUS_OPTIONS.map((s) => (
            <a
              key={s}
              href={`?page=1&status=${s}`}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                status === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {s}
            </a>
          ))}
        </div>
      </Suspense>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Guest</th>
              <th className="px-4 py-3 text-left font-medium">Reservation</th>
              <th className="px-4 py-3 text-left font-medium">Order</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {result.data.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  No payments found
                </td>
              </tr>
            ) : (
              result.data.map((p) => (
                <tr key={p.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{p.user.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{p.user.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-foreground">
                      {new Date(p.reservation.date).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {p.reservation.time} · {p.reservation.partySize} guests
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <OrderItemsCell items={p.orderItems} amount={p.amount} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(p.createdAt).toLocaleDateString("en-GB")}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[p.status] ?? "outline"}>
                      {p.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <PaymentStatusButton paymentId={p.id} currentStatus={p.status} />
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
    </div>
  );
}
