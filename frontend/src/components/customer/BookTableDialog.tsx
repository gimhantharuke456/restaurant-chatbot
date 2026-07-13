"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  CalendarDays, Clock, Users, Minus, Plus,
  ChevronRight, ChevronLeft, ShoppingCart, CreditCard, Loader2,
} from "lucide-react";
import Image from "next/image";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Slot {
  time: string;
  available: boolean;
  totalTables: number;
  bookedTables: number;
}

interface MenuItem {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  category: string;
  imageUrl?: string | null;
  isAvailable: boolean;
}

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
}

interface Props {
  restaurantId: string;
  restaurantName: string;
  totalSeats?: number | null;
  isActive: boolean;
  children: React.ReactNode;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().split("T")[0];
const SERVICE_CHARGE_RATE = 0.10;

function pad(n: number) { return String(n).padStart(2, "0"); }

function defaultSlots(): string[] {
  const slots: string[] = [];
  for (let h = 9; h <= 21; h++) {
    slots.push(`${pad(h)}:00`);
    slots.push(`${pad(h)}:30`);
  }
  return slots;
}

// ── Main component ─────────────────────────────────────────────────────────────

export function BookTableDialog({
  restaurantId, restaurantName, totalSeats, isActive, children,
}: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 state
  const [date, setDate] = useState(TODAY);
  const [time, setTime] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [specialRequests, setSpecialRequests] = useState("");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Step 2 state
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [cart, setCart] = useState<Map<string, CartItem>>(new Map());

  // Step 3 / submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxParty = totalSeats ?? 20;

  // Fetch availability when date changes
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

  // Fetch menu when entering step 2
  const fetchMenu = useCallback(async () => {
    if (menuItems.length > 0) return;
    setLoadingMenu(true);
    try {
      const res = await fetch(`/api/proxy/restaurants/${restaurantId}/menu`);
      const data = await res.json() as MenuItem[];
      setMenuItems(Array.isArray(data) ? data.filter((i) => i.isAvailable) : []);
    } catch {
      setMenuItems([]);
    } finally {
      setLoadingMenu(false);
    }
  }, [restaurantId, menuItems.length]);

  const goToStep2 = () => {
    setStep(2);
    fetchMenu();
  };

  // Cart helpers
  const setQty = (item: MenuItem, qty: number) => {
    setCart((prev) => {
      const next = new Map(prev);
      if (qty <= 0) {
        next.delete(item.id);
      } else {
        next.set(item.id, {
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: qty,
          category: item.category,
        });
      }
      return next;
    });
  };

  const cartItems = Array.from(cart.values());
  const subtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const serviceCharge = Math.round(subtotal * SERVICE_CHARGE_RATE);
  const total = subtotal + serviceCharge;
  const totalItems = cartItems.reduce((s, i) => s + i.quantity, 0);

  // Group menu by category
  const categories = Array.from(new Set(menuItems.map((i) => i.category)));

  // Submit: create reservation → create checkout session → redirect
  const handlePayment = async () => {
    setSubmitting(true);
    setError(null);
    try {
      // 1. Create reservation
      const resRes = await fetch("/api/proxy/reservations", {
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
      if (!resRes.ok) {
        const body = await resRes.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Could not create reservation");
      }
      const reservation = await resRes.json() as { id: string };

      // 2. Create checkout session
      const payRes = await fetch("/api/proxy/payments/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationId: reservation.id,
          orderItems: cartItems,
        }),
      });
      if (!payRes.ok) {
        const body = await payRes.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Could not initiate payment");
      }
      const { paymentUrl } = await payRes.json() as { paymentUrl: string; amount: number };

      // 3. Redirect to Stripe Checkout
      window.location.href = paymentUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStep(1);
    setDate(TODAY);
    setTime("");
    setPartySize(2);
    setSpecialRequests("");
    setError(null);
    setSlots(null);
    setCart(new Map());
    setMenuItems([]);
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) reset();
  };

  const displaySlots = slots ?? defaultSlots().map((t) => ({ time: t, available: true, totalTables: 0, bookedTables: 0 }));

  // Dialog width: wider for menu step
  const contentClass = step === 1
    ? "max-w-md p-0 overflow-hidden"
    : "max-w-xl p-0 overflow-hidden";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className={contentClass}>

        {/* ── Header ── */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                onClick={() => { setStep(step === 3 ? 2 : 1); setError(null); }}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <div className="flex-1">
              <DialogTitle className="text-base font-semibold">
                {step === 1 ? "Reserve a Table" : step === 2 ? "Choose Your Order" : "Review & Pay"}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{restaurantName}</p>
            </div>
            {/* Step indicator */}
            <div className="flex items-center gap-1">
              {([1, 2, 3] as const).map((s) => (
                <div
                  key={s}
                  className={`h-1.5 w-6 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`}
                />
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* ── Step 1: Date / Time / Party ── */}
        {step === 1 && (
          <div className="px-6 py-5 space-y-5">
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

            <Button
              className="w-full gap-2"
              disabled={!date || !time || !isActive}
              onClick={goToStep2}
            >
              Choose Your Order
              <ChevronRight className="h-4 w-4" />
            </Button>
            <p className="text-center text-[10px] text-muted-foreground -mt-2">
              Select menu items and pay in the next step
            </p>
          </div>
        )}

        {/* ── Step 2: Menu Selection ── */}
        {step === 2 && (
          <div className="flex flex-col" style={{ maxHeight: "70vh" }}>
            {loadingMenu ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : menuItems.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                No menu items available
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                  {categories.map((category) => (
                    <div key={category}>
                      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                        {category}
                      </h3>
                      <div className="space-y-3">
                        {menuItems.filter((i) => i.category === category).map((item) => {
                          const qty = cart.get(item.id)?.quantity ?? 0;
                          return (
                            <div key={item.id} className="flex gap-3 items-center rounded-xl border border-border bg-card p-3">
                              {/* Image */}
                              {item.imageUrl ? (
                                <div className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-muted">
                                  <Image
                                    src={item.imageUrl}
                                    alt={item.name}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                  />
                                </div>
                              ) : (
                                <div className="h-16 w-16 shrink-0 rounded-lg bg-muted flex items-center justify-center text-2xl">
                                  🍽️
                                </div>
                              )}
                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground leading-tight">{item.name}</p>
                                {item.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>
                                )}
                                <p className="text-sm font-semibold text-primary mt-1">
                                  LKR {item.price.toLocaleString()}
                                </p>
                              </div>
                              {/* Qty stepper */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                {qty > 0 ? (
                                  <>
                                    <button
                                      onClick={() => setQty(item, qty - 1)}
                                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-input bg-background hover:bg-muted transition-colors"
                                    >
                                      <Minus className="h-3 w-3" />
                                    </button>
                                    <span className="w-5 text-center text-sm font-semibold">{qty}</span>
                                    <button
                                      onClick={() => setQty(item, qty + 1)}
                                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                                    >
                                      <Plus className="h-3 w-3" />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => setQty(item, 1)}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="border-t px-6 py-4 bg-card">
                  <Button
                    className="w-full gap-2"
                    disabled={cartItems.length === 0}
                    onClick={() => setStep(3)}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Review Order
                    {totalItems > 0 && (
                      <span className="ml-auto rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs">
                        {totalItems} item{totalItems !== 1 ? "s" : ""}
                      </span>
                    )}
                  </Button>
                  {cartItems.length === 0 && (
                    <p className="text-center text-[10px] text-muted-foreground mt-1">
                      Add at least one item to continue
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Step 3: Bill Review ── */}
        {step === 3 && (
          <div className="px-6 py-5 space-y-5">
            {/* Booking summary */}
            <div className="rounded-xl bg-muted/40 border border-border px-4 py-3 space-y-1 text-sm">
              <div className="flex gap-2 items-center text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                <span>{new Date(date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} at {time}</span>
              </div>
              <div className="flex gap-2 items-center text-muted-foreground">
                <Users className="h-3.5 w-3.5 shrink-0" />
                <span>{partySize} {partySize === 1 ? "person" : "people"}</span>
              </div>
            </div>

            {/* Order items */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your Order</p>
              {cartItems.map((item) => (
                <div key={item.menuItemId} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">{item.quantity}×</span>
                    <span className="text-foreground">{item.name}</span>
                  </div>
                  <span className="font-medium tabular-nums">
                    LKR {(item.price * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-border pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums">LKR {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Service charge (10%)</span>
                <span className="tabular-nums">LKR {serviceCharge.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold text-foreground text-base pt-1 border-t border-border">
                <span>Total</span>
                <span className="tabular-nums">LKR {total.toLocaleString()}</span>
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}

            <Button
              className="w-full gap-2"
              disabled={submitting || !isActive}
              onClick={handlePayment}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  Reserve & Pay LKR {total.toLocaleString()}
                </>
              )}
            </Button>
            <p className="text-center text-[10px] text-muted-foreground -mt-2">
              You'll be redirected to Stripe's secure payment page
            </p>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
