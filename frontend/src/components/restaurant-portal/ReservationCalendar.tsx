"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
}

interface Reservation {
  id: string;
  date: string;
  time: string;
  partySize: number;
  specialRequests: string | null;
  status: string;
  user: { name: string | null; email: string; phone: string | null };
  payment: { orderItems: OrderItem[] | null; amount: number; status: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-400",
  CONFIRMED: "bg-green-500",
  COMPLETED: "bg-muted-foreground",
  CANCELLED: "bg-red-400",
  NO_SHOW: "bg-red-600",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  CONFIRMED: "default",
  COMPLETED: "outline",
  CANCELLED: "destructive",
  NO_SHOW: "destructive",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function toLocalDateStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function ReservationCalendar() {
  const router = useRouter();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchMonth = useCallback(async (y: number, m: number) => {
    setLoading(true);
    const from = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const to = `${y}-${String(m + 1).padStart(2, "0")}-${lastDay}`;
    const res = await fetch(`/api/proxy/restaurant-portal/reservations?from=${from}&to=${to}&limit=500`);
    if (res.ok) {
      const data = await res.json() as { data: Reservation[] };
      setReservations(data.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void fetchMonth(year, month); }, [year, month, fetchMonth]);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
  };

  // Build calendar grid
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  // Group by date string
  const byDate: Record<string, Reservation[]> = {};
  for (const r of reservations) {
    const key = r.date.slice(0, 10);
    (byDate[key] ??= []).push(r);
  }

  const selectedReservations = selectedDate ? (byDate[selectedDate] ?? []) : [];

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    await fetch(`/api/proxy/restaurant-portal/reservations/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await fetchMonth(year, month);
    setUpdatingId(null);
    router.refresh();
  };

  return (
    <div className="flex gap-6">
      {/* Calendar */}
      <div className="flex-1 rounded-xl border bg-card shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <button onClick={prevMonth} className="p-1 rounded hover:bg-muted">
            <ChevronLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <h2 className="text-lg font-semibold text-foreground">
            {MONTHS[month]} {year}
          </h2>
          <button onClick={nextMonth} className="p-1 rounded hover:bg-muted">
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 border-b">
          {DAYS.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
            Loading…
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (!day) return <div key={i} className="border-b border-r min-h-[90px] bg-muted/30" />;

              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayRes = byDate[dateStr] ?? [];
              const isToday = toLocalDateStr(today) === dateStr;
              const isSelected = selectedDate === dateStr;

              return (
                <div
                  key={i}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={`border-b border-r min-h-[90px] p-2 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-blue-50 ring-2 ring-inset ring-blue-400"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full ${
                    isToday ? "bg-blue-600 text-white" : "text-foreground"
                  }`}>
                    {day}
                  </div>

                  {dayRes.length > 0 && (
                    <div className="space-y-0.5">
                      {dayRes.slice(0, 3).map((r) => (
                        <div
                          key={r.id}
                          className={`text-xs text-white rounded px-1 py-0.5 truncate ${STATUS_COLORS[r.status] ?? "bg-muted-foreground"}`}
                        >
                          {r.time} · {r.user.name ?? r.user.email.split("@")[0]}
                        </div>
                      ))}
                      {dayRes.length > 3 && (
                        <div className="text-xs text-muted-foreground pl-1">+{dayRes.length - 3} more</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-3 px-6 py-3 border-t bg-muted/50 text-xs text-muted-foreground">
          {Object.entries(STATUS_COLORS).map(([s, cls]) => (
            <div key={s} className="flex items-center gap-1.5">
              <span className={`inline-block w-2.5 h-2.5 rounded-sm ${cls}`} />
              {s}
            </div>
          ))}
        </div>
      </div>

      {/* Side panel */}
      {selectedDate && (
        <div className="w-80 rounded-xl border bg-card shadow-sm flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
            <span className="font-semibold text-foreground text-sm">
              {new Date(selectedDate + "T00:00:00").toLocaleDateString(undefined, {
                weekday: "long", month: "long", day: "numeric",
              })}
            </span>
            <button onClick={() => setSelectedDate(null)} className="p-1 rounded hover:bg-muted">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {selectedReservations.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              No reservations
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y">
              {selectedReservations
                .sort((a, b) => a.time.localeCompare(b.time))
                .map((r) => (
                  <div key={r.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium text-sm text-foreground">
                          {r.user.name ?? r.user.email}
                        </div>
                        <div className="text-xs text-muted-foreground">{r.user.phone ?? r.user.email}</div>
                      </div>
                      <Badge variant={STATUS_VARIANT[r.status] ?? "secondary"} className="text-xs shrink-0">
                        {r.status}
                      </Badge>
                    </div>

                    <div className="text-xs text-muted-foreground flex gap-3">
                      <span>🕐 {r.time}</span>
                      <span>👥 {r.partySize} guests</span>
                    </div>

                    {r.specialRequests && (
                      <div className="text-xs text-muted-foreground italic">"{r.specialRequests}"</div>
                    )}

                    {r.payment?.orderItems && r.payment.orderItems.length > 0 && (
                      <div className="rounded-md border border-border bg-muted/30 p-2 space-y-1">
                        <div className="text-xs font-medium text-foreground">Pre-Order</div>
                        {r.payment.orderItems.map((item, i) => (
                          <div key={i} className="flex justify-between text-xs text-muted-foreground">
                            <span><span className="text-foreground">{item.quantity}×</span> {item.name}</span>
                            <span>LKR {(item.price * item.quantity).toLocaleString()}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-xs font-medium text-foreground border-t border-border pt-1 mt-1">
                          <span>Total</span>
                          <span>LKR {r.payment.amount.toLocaleString()}</span>
                        </div>
                      </div>
                    )}

                    <select
                      defaultValue={r.status}
                      disabled={updatingId === r.id}
                      onChange={(e) => updateStatus(r.id, e.target.value)}
                      className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-xs font-medium disabled:opacity-50"
                    >
                      {["PENDING","CONFIRMED","COMPLETED","CANCELLED","NO_SHOW"].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                ))}
            </div>
          )}

          <div className="px-4 py-3 border-t bg-muted/50 text-xs text-muted-foreground">
            {selectedReservations.length} reservation{selectedReservations.length !== 1 ? "s" : ""}
            {" · "}
            {selectedReservations.reduce((n, r) => n + r.partySize, 0)} total guests
          </div>
        </div>
      )}
    </div>
  );
}
