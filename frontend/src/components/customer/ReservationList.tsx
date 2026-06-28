"use client";

import { useState } from "react";
import { ReservationCard, type Reservation, type ReviewData } from "./ReservationCard";
import { CalendarX } from "lucide-react";

export function ReservationList({ initial }: { initial: Reservation[] }) {
  const [reservations, setReservations] = useState(initial);

  function handleCancel(id: string) {
    setReservations(prev =>
      prev.map(r => r.id === id ? { ...r, status: "CANCELLED" } : r)
    );
  }

  function handleReviewSaved(id: string, review: ReviewData) {
    setReservations(prev =>
      prev.map(r => r.id === id ? { ...r, review } : r)
    );
  }

  if (reservations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
        <CalendarX className="h-10 w-10" />
        <p className="font-medium">No reservations yet</p>
        <p className="text-sm">Head to the Chat tab to discover and book restaurants.</p>
      </div>
    );
  }

  const upcoming = reservations.filter(r => r.status === "PENDING" || r.status === "CONFIRMED");
  const past = reservations.filter(r => !["PENDING", "CONFIRMED"].includes(r.status));

  return (
    <div className="space-y-6">
      {upcoming.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Upcoming</h2>
          {upcoming.map(r => (
            <ReservationCard key={r.id} reservation={r} onCancel={handleCancel} onReviewSaved={handleReviewSaved} />
          ))}
        </section>
      )}
      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Past</h2>
          {past.map(r => (
            <ReservationCard key={r.id} reservation={r} onReviewSaved={handleReviewSaved} />
          ))}
        </section>
      )}
    </div>
  );
}
