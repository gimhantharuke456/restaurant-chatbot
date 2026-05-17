"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReservationStatus } from "@/types/admin";

interface ReservationStatusButtonProps {
  reservationId: string;
  currentStatus: ReservationStatus;
}

const TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "NO_SHOW", "CANCELLED"],
  CANCELLED: [],
  COMPLETED: [],
  NO_SHOW: [],
};

const LABELS: Record<ReservationStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  NO_SHOW: "No Show",
};

export function ReservationStatusButton({
  reservationId,
  currentStatus,
}: ReservationStatusButtonProps) {
  const [status, setStatus] = useState<ReservationStatus>(currentStatus);
  const [saving, setSaving] = useState(false);

  const allowed = TRANSITIONS[status];

  if (allowed.length === 0) {
    return (
      <span className="text-sm font-medium text-slate-600">
        {LABELS[status]}
      </span>
    );
  }

  const handleChange = async (newStatus: string) => {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/proxy/admin/reservations/${reservationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      if (res.ok) setStatus(newStatus as ReservationStatus);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Select value={status} onValueChange={handleChange} disabled={saving}>
      <SelectTrigger className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={status} disabled>
          {LABELS[status]}
        </SelectItem>
        {allowed.map((s) => (
          <SelectItem key={s} value={s}>
            → {LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
