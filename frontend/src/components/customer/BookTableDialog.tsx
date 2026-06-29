"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, Users, CheckCircle2, Minus, Plus, ChevronRight } from "lucide-react";
import Link from "next/link";

interface Slot {
  time: string;
  available: boolean;
  totalTables: number;
  bookedTables: number;
}

interface Props {
  restaurantId: string;
  restaurantName: string;
  totalSeats?: number | null;
  isActive: boolean;
  children: React.ReactNode;
}

const TODAY = new Date().toISOString().split("T")[0];

function pad(n: number) { return String(n).padStart(2, "0"); }

// Generate fallback half-hour slots 09:00–22:00
function defaultSlots(): string[] {
  const slots: string[] = [];
  for (let h = 9; h <= 21; h++) {
    slots.push(`${pad(h)}:00`);
    slots.push(`${pad(h)}:30`);
  }
  return slots;
}

export function BookTableDialog({ restaurantId, restaurantName, totalSeats, isActive, children }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [date, setDate] = useState(TODAY);
  const [time, setTime] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [specialRequests, setSpecialRequests] = useState("");

  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);

  const maxParty = totalSeats ?? 20;

  // Fetch availability whenever date changes
  useEffect(() => {
    if (!open || !date) return;
    setSlots(null);
    setTime("");
    setLoadingSlots(true);
    fetch(`/api/proxy/restaurants/${restaurantId}/availability?date=${date}`)
      .then((r) => r.json())
      .then((data: Slot[]) => {
        setSlots(Array.isArray(data) && data.length > 0 ? data : null);
      })
      .catch(() => setSlots(null))
      .finally(() => setLoadingSlots(false));
  }, [date, open, restaurantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/proxy/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          date,
          time,
          partySize,
          specialRequests: specialRequests.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Booking failed — please try again");
      }
      const data = await res.json() as { id: string };
      setConfirmedId(data.id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setDate(TODAY);
    setTime("");
    setPartySize(2);
    setSpecialRequests("");
    setError(null);
    setConfirmedId(null);
    setSlots(null);
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) reset();
  };

  const displaySlots = slots ?? defaultSlots().map((t) => ({ time: t, available: true, totalTables: 0, bookedTables: 0 }));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-base font-semibold">Reserve a Table</DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{restaurantName}</p>
        </DialogHeader>

        {confirmedId ? (
          /* ── Success state ── */
          <div className="px-6 py-10 flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground text-lg">Booking Confirmed!</p>
              <p className="text-sm text-muted-foreground">
                {new Date(date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                {" at "}{time} · {partySize} {partySize === 1 ? "person" : "people"}
              </p>
              <p className="text-xs text-muted-foreground">A confirmation email has been sent.</p>
            </div>
            <div className="flex gap-2 w-full pt-2">
              <Button variant="outline" className="flex-1" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
              <Button asChild className="flex-1 gap-1.5">
                <Link href="/reservations">
                  My Reservations <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          /* ── Booking form ── */
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

            {/* Date */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground uppercase tracking-wide">
                <CalendarDays className="h-3.5 w-3.5 text-primary" />
                Date
              </label>
              <input
                type="date"
                value={date}
                min={TODAY}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />
            </div>

            {/* Time slots */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground uppercase tracking-wide">
                <Clock className="h-3.5 w-3.5 text-primary" />
                Time
                {slots && <span className="ml-auto text-[10px] font-normal text-green-600 normal-case">Live availability</span>}
              </label>
              {loadingSlots ? (
                <div className="flex gap-1.5 flex-wrap">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-8 w-16 rounded-lg bg-muted animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {displaySlots.map((s) => {
                    const unavailable = slots ? !s.available : false;
                    return (
                      <button
                        key={s.time}
                        type="button"
                        disabled={unavailable}
                        onClick={() => setTime(s.time)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors
                          ${unavailable
                            ? "border-border/30 text-muted-foreground/40 cursor-not-allowed line-through"
                            : time === s.time
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/50"
                          }`}
                      >
                        {s.time}
                      </button>
                    );
                  })}
                </div>
              )}
              {!time && !loadingSlots && (
                <p className="text-[10px] text-muted-foreground">Select a time slot above</p>
              )}
            </div>

            {/* Party size */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-foreground uppercase tracking-wide">
                <Users className="h-3.5 w-3.5 text-primary" />
                Party Size
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPartySize((p) => Math.max(1, p - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-input bg-background hover:bg-muted transition-colors disabled:opacity-40"
                  disabled={partySize <= 1}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-[3rem] text-center text-base font-semibold text-foreground">
                  {partySize} {partySize === 1 ? "person" : "people"}
                </span>
                <button
                  type="button"
                  onClick={() => setPartySize((p) => Math.min(maxParty, p + 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-input bg-background hover:bg-muted transition-colors disabled:opacity-40"
                  disabled={partySize >= maxParty}
                >
                  <Plus className="h-4 w-4" />
                </button>
                {totalSeats && (
                  <span className="text-xs text-muted-foreground">max {totalSeats}</span>
                )}
              </div>
            </div>

            {/* Special requests */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                Special Requests <span className="font-normal text-muted-foreground normal-case">(optional)</span>
              </label>
              <textarea
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="Allergies, dietary needs, anniversary, birthday cake…"
                className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full gap-2"
              disabled={!date || !time || submitting || !isActive}
            >
              {submitting ? "Confirming…" : "Confirm Reservation"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
