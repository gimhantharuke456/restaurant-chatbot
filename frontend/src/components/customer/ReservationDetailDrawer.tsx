"use client";

import { useEffect } from "react";
import Image from "next/image";
import {
  X,
  MapPin,
  CalendarDays,
  Clock,
  Users,
  MessageSquare,
  CreditCard,
  ShoppingBag,
  Star,
  Receipt,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Reservation } from "./ReservationCard";

const STATUS_COLOURS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  COMPLETED: "bg-blue-100 text-blue-800",
  NO_SHOW: "bg-gray-100 text-gray-700",
};

const PAYMENT_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  SUCCEEDED: "default",
  PENDING: "secondary",
  FAILED: "destructive",
  REFUNDED: "secondary",
};

interface Props {
  reservation: Reservation;
  onClose: () => void;
}

function Section({ title, icon: Icon, children }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-4 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-foreground text-right">{value}</span>
    </div>
  );
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-4 w-4 ${n <= rating ? "fill-amber-400 text-amber-400" : "fill-none text-muted-foreground/30"}`}
        />
      ))}
      <span className="ml-1.5 text-sm text-muted-foreground">{rating}/5</span>
    </div>
  );
}

export function ReservationDetailDrawer({ reservation: r, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const dateLabel = new Date(r.date).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const orderItems: Array<{ name: string; price: number; quantity: number }> =
    (() => {
      if (!r.payment?.orderItems) return [];
      try {
        const raw = r.payment.orderItems;
        return Array.isArray(raw) ? raw : JSON.parse(raw as string);
      } catch { return []; }
    })();

  const reviewImageUrls: string[] = (() => {
    if (!r.review?.imageUrls) return [];
    try { return JSON.parse(r.review.imageUrls) as string[]; } catch { return []; }
  })();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md flex flex-col bg-card border-l border-border shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
          <div className="min-w-0">
            <h2 className="font-semibold text-foreground truncate">{r.restaurant.name}</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3 shrink-0" />
              {r.restaurant.address}, {r.restaurant.area}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOURS[r.status] ?? "bg-muted"}`}>
              {r.status}
            </span>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

          {/* Booking details */}
          <Section title="Booking Details" icon={CalendarDays}>
            <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 space-y-2.5">
              <Row label="Date" value={dateLabel} />
              <Row label="Time" value={<span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-muted-foreground" />{r.time}</span>} />
              <Row label="Party size" value={<span className="flex items-center gap-1"><Users className="h-3.5 w-3.5 text-muted-foreground" />{r.partySize} {r.partySize === 1 ? "person" : "people"}</span>} />
              <Row label="Booked on" value={new Date(r.createdAt).toLocaleDateString("en-GB")} />
              {r.specialRequests && (
                <div className="pt-1 border-t border-border">
                  <p className="text-xs text-muted-foreground flex gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span className="italic">"{r.specialRequests}"</span>
                  </p>
                </div>
              )}
            </div>
          </Section>

          {/* Pre-order */}
          {orderItems.length > 0 && (
            <Section title="Pre-Order" icon={ShoppingBag}>
              <div className="rounded-lg border border-border bg-muted/20 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Item</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">Qty</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {orderItems.map((item, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2.5 text-foreground">{item.name}</td>
                        <td className="px-4 py-2.5 text-center text-muted-foreground">{item.quantity}</td>
                        <td className="px-4 py-2.5 text-right text-foreground">
                          LKR {(item.price * item.quantity).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* Payment */}
          {r.payment && (
            <Section title="Payment" icon={CreditCard}>
              <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 space-y-2.5">
                <Row
                  label="Status"
                  value={
                    <Badge variant={PAYMENT_VARIANT[r.payment.status] ?? "secondary"} className="text-xs">
                      {r.payment.status}
                    </Badge>
                  }
                />
                <Row label="Currency" value={r.payment.currency} />
                {orderItems.length > 0 && (
                  <>
                    <div className="border-t border-border pt-2.5">
                      <div className="flex justify-between text-sm font-semibold text-foreground">
                        <span>Total Bill</span>
                        <span>LKR {r.payment.amount.toLocaleString()}</span>
                      </div>
                    </div>
                  </>
                )}
                {orderItems.length === 0 && (
                  <Row label="Amount" value={`LKR ${r.payment.amount.toLocaleString()}`} />
                )}
                {r.payment.receiptUrl && (
                  <div className="pt-1 border-t border-border">
                    <a
                      href={r.payment.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                      <Receipt className="h-3.5 w-3.5" />
                      View receipt
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Review */}
          {r.review && (
            <Section title="Your Review" icon={Star}>
              <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 space-y-2.5">
                <StarDisplay rating={r.review.rating} />
                {r.review.comment && (
                  <p className="text-sm text-muted-foreground">{r.review.comment}</p>
                )}
                {reviewImageUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {reviewImageUrls.map((url, i) => (
                      <div key={i} className="relative h-20 w-20 rounded-lg overflow-hidden border border-border">
                        <Image src={url} alt={`Review photo ${i + 1}`} fill className="object-cover" unoptimized />
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {new Date(r.review.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric", month: "long", year: "numeric",
                  })}
                </p>
              </div>
            </Section>
          )}
        </div>
      </div>
    </>
  );
}
