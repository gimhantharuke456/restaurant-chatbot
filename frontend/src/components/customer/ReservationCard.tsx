"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Clock, Users, MapPin, X, Star, Pencil, ChevronRight } from "lucide-react";
import { ReviewModal } from "./ReviewModal";
import { ReservationDetailDrawer } from "./ReservationDetailDrawer";

const STATUS_COLOURS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  COMPLETED: "bg-blue-100 text-blue-800",
  NO_SHOW: "bg-gray-100 text-gray-700",
};

export interface ReviewData {
  id: string;
  rating: number;
  comment: string | null;
  imageUrls: string;
  createdAt: string;
}

export interface OrderItem {
  name: string;
  price: number;
  quantity: number;
  category?: string;
}

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receiptUrl: string | null;
  orderItems: OrderItem[] | null;
  createdAt: string;
}

export interface Reservation {
  id: string;
  restaurantId: string;
  restaurant: { name: string; address: string; area: string };
  date: string;
  time: string;
  partySize: number;
  specialRequests: string | null;
  status: string;
  createdAt: string;
  payment: Payment | null;
  review: ReviewData | null;
}

interface ReservationCardProps {
  reservation: Reservation;
  onCancel?: (id: string) => void;
  onReviewSaved?: (id: string, review: ReviewData) => void;
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3.5 w-3.5 ${n <= rating ? "fill-amber-400 text-amber-400" : "fill-none text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

export function ReservationCard({ reservation, onCancel, onReviewSaved }: ReservationCardProps) {
  const [cancelling, setCancelling] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [review, setReview] = useState<ReviewData | null>(reservation.review);

  const canCancel = reservation.status === "PENDING" || reservation.status === "CONFIRMED";
  const canReview = reservation.status === "COMPLETED";
  const dateLabel = new Date(reservation.date).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  async function handleCancel(e: React.MouseEvent) {
    e.stopPropagation();
    if (!onCancel) return;
    setCancelling(true);
    try {
      await fetch(`/api/proxy/reservations/${reservation.id}`, { method: "DELETE" });
      onCancel(reservation.id);
    } finally {
      setCancelling(false);
    }
  }

  function handleReviewSaved(saved: ReviewData) {
    setReview(saved);
    setShowReview(false);
    onReviewSaved?.(reservation.id, saved);
  }

  const reservationWithReview = { ...reservation, review };

  return (
    <>
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setShowDetail(true)}
      >
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{reservation.restaurant.name}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3 shrink-0" />
                {reservation.restaurant.area}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOURS[reservation.status] ?? "bg-muted"}`}>
                {reservation.status}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" /> {dateLabel}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {reservation.time}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> {reservation.partySize} {reservation.partySize === 1 ? "person" : "people"}
            </span>
          </div>

          {/* Pre-order summary */}
          {reservation.payment?.orderItems && reservation.payment.orderItems.length > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {reservation.payment.orderItems.length} item{reservation.payment.orderItems.length !== 1 ? "s" : ""} pre-ordered
              </span>
              <span className="font-medium text-foreground">
                LKR {reservation.payment.amount.toLocaleString()}
              </span>
            </div>
          )}

          {/* Existing review summary */}
          {review && (
            <div className="rounded-md bg-muted/30 border border-border px-3 py-2 space-y-1">
              <div className="flex items-center justify-between">
                <StarDisplay rating={review.rating} />
                <span className="text-xs text-muted-foreground">
                  {new Date(review.createdAt).toLocaleDateString("en-GB")}
                </span>
              </div>
              {review.comment && (
                <p className="text-xs text-muted-foreground line-clamp-1">{review.comment}</p>
              )}
            </div>
          )}

          <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
            {canCancel && onCancel && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive border-destructive/30"
                onClick={handleCancel}
                disabled={cancelling}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                {cancelling ? "Cancelling…" : "Cancel reservation"}
              </Button>
            )}
            {canReview && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => { e.stopPropagation(); setShowReview(true); }}
              >
                {review ? (
                  <><Pencil className="h-3.5 w-3.5 mr-1" />Edit Review</>
                ) : (
                  <><Star className="h-3.5 w-3.5 mr-1" />Write Review</>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {showDetail && (
        <ReservationDetailDrawer
          reservation={reservationWithReview}
          onClose={() => setShowDetail(false)}
        />
      )}

      {showReview && (
        <ReviewModal
          reservationId={reservation.id}
          restaurantName={reservation.restaurant.name}
          existingReview={review}
          onClose={() => setShowReview(false)}
          onSaved={handleReviewSaved}
        />
      )}
    </>
  );
}
