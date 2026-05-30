"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Clock, Users, MapPin, X } from "lucide-react";

const STATUS_COLOURS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  COMPLETED: "bg-blue-100 text-blue-800",
  NO_SHOW: "bg-gray-100 text-gray-700",
};

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
}

interface ReservationCardProps {
  reservation: Reservation;
  onCancel?: (id: string) => void;
}

export function ReservationCard({ reservation, onCancel }: ReservationCardProps) {
  const [cancelling, setCancelling] = useState(false);

  const canCancel = reservation.status === "PENDING" || reservation.status === "CONFIRMED";
  const dateLabel = new Date(reservation.date).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  async function handleCancel() {
    if (!onCancel) return;
    setCancelling(true);
    try {
      await fetch(`/api/proxy/reservations/${reservation.id}`, { method: "DELETE" });
      onCancel(reservation.id);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-sm">{reservation.restaurant.name}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" />
              {reservation.restaurant.area}
            </p>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOURS[reservation.status] ?? "bg-muted"}`}>
            {reservation.status}
          </span>
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

        {reservation.specialRequests && (
          <p className="text-xs text-muted-foreground italic">"{reservation.specialRequests}"</p>
        )}

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
      </CardContent>
    </Card>
  );
}
