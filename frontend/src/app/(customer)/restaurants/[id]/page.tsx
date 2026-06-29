import { serverFetch } from "@/lib/server/api";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin, Phone, Mail, Globe, Star, ArrowLeft,
  Map, Tag, Users, Clock, CheckCircle2, ChevronRight, CalendarDays,
} from "lucide-react";
import { FavoriteButton } from "@/components/customer/FavoriteButton";
import { WaitlistJoinForm } from "@/components/customer/WaitlistJoinForm";
import { BookTableDialog } from "@/components/customer/BookTableDialog";
import { OpenChatButton } from "@/components/customer/OpenChatButton";

// ── types ─────────────────────────────────────────────────────────────────────

interface OpeningHoursDay { open?: string; close?: string; isOpen?: boolean; closed?: boolean }
type OpeningHours = Record<string, OpeningHoursDay | string | null>;

interface Restaurant {
  id: string; name: string; description: string | null;
  address: string; area: string; phone: string | null; email: string | null; website: string | null;
  cuisineTypes: string[]; imageUrls: string[]; profileImageUrl: string | null; coverImageUrl: string | null;
  priceRange: string; isActive: boolean; isVerified: boolean;
  avgRating: number | null; totalReviews: number; totalSeats: number | null;
  latitude: number | null; longitude: number | null; openingHours: OpeningHours | null;
}

interface MenuItem {
  id: string; name: string; description: string | null;
  price: number; category: string; imageUrl: string | null; isAvailable: boolean;
}

interface Review {
  id: string; rating: number; comment: string | null; createdAt: string;
  user: { name: string | null; avatarUrl: string | null };
  reply: { content: string } | null;
}

interface Promotion {
  id: string; title: string; description: string | null;
  discountType: string; discountValue: number; startDate: string; endDate: string;
}

// ── constants ─────────────────────────────────────────────────────────────────

const PRICE_LABEL: Record<string, string> = {
  BUDGET: "$", MODERATE: "$$", EXPENSIVE: "$$$", FINE_DINING: "$$$$",
};
const PRICE_FULL: Record<string, string> = {
  BUDGET: "Budget", MODERATE: "Moderate", EXPENSIVE: "Expensive", FINE_DINING: "Fine Dining",
};
const DAY_ORDER = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
const DAY_LABEL: Record<string, string> = {
  monday:"Monday", tuesday:"Tuesday", wednesday:"Wednesday", thursday:"Thursday",
  friday:"Friday", saturday:"Saturday", sunday:"Sunday",
};

// ── helpers ───────────────────────────────────────────────────────────────────

function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const cls = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map((n) => (
        <Star key={n} className={`${cls} ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/25"}`} />
      ))}
    </div>
  );
}

// ── sub-components ────────────────────────────────────────────────────────────

function OpeningHoursSection({ hours }: { hours: OpeningHours }) {
  const today = DAY_ORDER[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  const entries = DAY_ORDER.map((d) => {
    const val = hours[d];
    if (!val || typeof val !== "object") return { day: d, label: DAY_LABEL[d], open: null, close: null, closed: true };
    const h = val as OpeningHoursDay;
    const isClosed = h.closed === true || h.isOpen === false;
    return { day: d, label: DAY_LABEL[d], open: h.open ?? null, close: h.close ?? null, closed: isClosed };
  });

  return (
    <div className="space-y-1">
      {entries.map((e) => (
        <div
          key={e.day}
          className={`flex justify-between rounded-lg px-3 py-1.5 text-xs ${
            e.day === today
              ? "bg-primary/10 text-primary font-semibold"
              : "text-muted-foreground hover:bg-muted/40"
          }`}
        >
          <span className="flex items-center gap-1.5">
            {e.day === today && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
            {e.label}
          </span>
          <span>{e.closed ? "Closed" : `${e.open ?? "—"} – ${e.close ?? "—"}`}</span>
        </div>
      ))}
    </div>
  );
}

function MenuItemCard({ item }: { item: MenuItem }) {
  return (
    <div className={`group relative flex flex-col rounded-xl border bg-card overflow-hidden transition-colors hover:border-primary/30 ${!item.isAvailable ? "opacity-60" : ""}`}>
      {/* Image */}
      <div className="relative h-36 w-full bg-muted overflow-hidden shrink-0">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl opacity-20 select-none">🍽️</div>
        )}
        {!item.isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <span className="rounded-full bg-destructive/90 px-2.5 py-0.5 text-[10px] font-semibold text-white">
              Unavailable
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-3 gap-1">
        <p className="text-sm font-semibold text-foreground leading-tight line-clamp-1">{item.name}</p>
        {item.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed flex-1">{item.description}</p>
        )}
        <p className="text-sm font-bold text-primary mt-1">LKR {item.price.toLocaleString()}</p>
      </div>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default async function RestaurantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let restaurant: Restaurant;
  try {
    restaurant = await serverFetch<Restaurant>(`restaurants/${id}`);
  } catch {
    notFound();
  }

  const [menuItems, reviewsData, promotions] = await Promise.all([
    serverFetch<MenuItem[]>(`restaurants/${id}/menu`).catch(() => [] as MenuItem[]),
    serverFetch<{ data: Review[]; total: number }>(`restaurants/${id}/reviews?limit=6`).catch(() => ({ data: [], total: 0 })),
    serverFetch<Promotion[]>(`restaurants/${id}/promotions`).catch(() => [] as Promotion[]),
  ]);

  const byCategory = menuItems.reduce<Record<string, MenuItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const coverImage = restaurant.coverImageUrl ?? restaurant.imageUrls?.[0] ?? null;
  const profileImage = restaurant.profileImageUrl ?? null;
  const mapsUrl = restaurant.latitude && restaurant.longitude
    ? `https://www.google.com/maps?q=${restaurant.latitude},${restaurant.longitude}`
    : `https://www.google.com/maps/search/${encodeURIComponent(restaurant.name + " " + restaurant.address)}`;

  return (
    <div className="h-full overflow-y-auto bg-background">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative h-64 w-full bg-muted">
        {coverImage ? (
          <Image src={coverImage} alt={restaurant.name} fill className="object-cover" unoptimized />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-8xl opacity-10 select-none">🍽️</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />

        {/* Back button */}
        <div className="absolute top-4 left-4">
          <Link
            href="/home"
            className="inline-flex items-center gap-1.5 rounded-full bg-background/80 backdrop-blur border border-border/50 px-3 py-1.5 text-sm font-medium text-foreground hover:bg-background transition-colors shadow-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>
        </div>

        {/* Profile logo */}
        {profileImage && (
          <div className="absolute bottom-0 left-6 translate-y-1/2 z-10">
            <div className="relative h-20 w-20 rounded-2xl overflow-hidden border-4 border-background bg-muted shadow-xl">
              <Image src={profileImage} alt={`${restaurant.name} logo`} fill className="object-cover" unoptimized />
            </div>
          </div>
        )}
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 pb-20">

        {/* Title strip */}
        <div className={`flex items-end justify-between gap-4 pb-5 border-b border-border/50 ${profileImage ? "pt-14" : "pt-5"}`}>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground leading-tight">{restaurant.name}</h1>
              {restaurant.isVerified && (
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              )}
              {!restaurant.isActive && (
                <Badge variant="destructive" className="text-xs">Temporarily Closed</Badge>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{restaurant.area} · {restaurant.address}</span>
            </div>

            <div className="flex items-center gap-3 flex-wrap pt-0.5">
              {restaurant.avgRating != null && (
                <div className="flex items-center gap-1.5">
                  <Stars rating={Math.round(restaurant.avgRating)} />
                  <span className="text-sm font-semibold text-amber-500">{restaurant.avgRating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">({restaurant.totalReviews})</span>
                </div>
              )}
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-sm text-muted-foreground" title={PRICE_FULL[restaurant.priceRange]}>
                {PRICE_LABEL[restaurant.priceRange] ?? restaurant.priceRange}
              </span>
              {restaurant.cuisineTypes.slice(0, 3).map((c) => (
                <Badge key={c} variant="secondary" className="text-xs font-normal">{c}</Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <FavoriteButton restaurantId={restaurant.id} />
          </div>
        </div>

        {/* ── Two-column layout ────────────────────────────────────────────── */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left: main content ─────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-8">

            {/* Description */}
            {restaurant.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{restaurant.description}</p>
            )}

            {/* Promotions */}
            {promotions.length > 0 && (
              <section>
                <SectionHeading icon={<Tag className="h-4 w-4" />} title="Active Offers" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  {promotions.map((p) => (
                    <div key={p.id} className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1.5">
                      <p className="text-sm font-semibold text-foreground">{p.title}</p>
                      {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <span className="text-xs font-bold text-primary">
                          {p.discountType === "PERCENTAGE" ? `${p.discountValue}% off` : `LKR ${p.discountValue} off`}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Until {new Date(p.endDate).toLocaleDateString("en-GB")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Gallery */}
            {restaurant.imageUrls.length > 0 && (
              <section>
                <SectionHeading title="Photos" count={restaurant.imageUrls.length} />
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
                  {restaurant.imageUrls.slice(0, 8).map((url, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-muted group cursor-pointer">
                      <Image src={url} alt="" fill className="object-cover transition-transform duration-300 group-hover:scale-105" unoptimized />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Menu */}
            {Object.keys(byCategory).length > 0 && (
              <section>
                <SectionHeading title="Menu" count={menuItems.length} />
                <div className="mt-3 space-y-6">
                  {Object.entries(byCategory).map(([category, items]) => (
                    <div key={category}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{category}</span>
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-muted-foreground">{items.length} items</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {items.map((item) => (
                          <MenuItemCard key={item.id} item={item} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Reviews */}
            {reviewsData.data.length > 0 && (
              <section>
                <SectionHeading title="Reviews" count={reviewsData.total} />
                <div className="mt-3 space-y-3">
                  {reviewsData.data.map((review) => (
                    <div key={review.id} className="rounded-xl border bg-card p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                            {(review.user.name ?? "U")[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground leading-tight">{review.user.name ?? "Anonymous"}</p>
                            <p className="text-[10px] text-muted-foreground">{new Date(review.createdAt).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" })}</p>
                          </div>
                        </div>
                        <Stars rating={review.rating} />
                      </div>
                      {review.comment && (
                        <p className="text-xs text-muted-foreground leading-relaxed">{review.comment}</p>
                      )}
                      {review.reply && (
                        <div className="rounded-lg bg-muted/60 border border-border/50 px-3 py-2.5 space-y-0.5">
                          <p className="text-[10px] font-bold text-primary uppercase tracking-wide">Owner reply</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{review.reply.content}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Waitlist */}
            <WaitlistJoinForm restaurantId={restaurant.id} restaurantName={restaurant.name} />
          </div>

          {/* ── Right: sidebar ─────────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* CTA card */}
            <div className="rounded-xl border bg-card p-4 space-y-2.5">
              {/* Direct booking */}
              <BookTableDialog
                restaurantId={restaurant.id}
                restaurantName={restaurant.name}
                totalSeats={restaurant.totalSeats}
                isActive={restaurant.isActive}
              >
                <Button className="w-full gap-2" disabled={!restaurant.isActive}>
                  <CalendarDays className="h-4 w-4" />
                  Reserve a Table
                </Button>
              </BookTableDialog>

              {/* Divider */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* AI booking */}
              <OpenChatButton
                message={`I'd like to book a table at ${restaurant.name}. Can you help me with availability and reservations?`}
                disabled={!restaurant.isActive}
              />

              {/* Secondary links */}
              <div className="flex gap-2 pt-0.5">
                {restaurant.website && (
                  <Button asChild variant="ghost" className="flex-1 gap-1.5 text-xs" size="sm">
                    <a href={restaurant.website} target="_blank" rel="noopener noreferrer">
                      <Globe className="h-3.5 w-3.5" />
                      Website
                    </a>
                  </Button>
                )}
                <Button asChild variant="ghost" className="flex-1 gap-1.5 text-xs" size="sm">
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                    <Map className="h-3.5 w-3.5" />
                    Directions
                  </a>
                </Button>
              </div>
            </div>

            {/* Quick info */}
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Details</p>
              <div className="space-y-2.5">
                {restaurant.phone && (
                  <a href={`tel:${restaurant.phone}`} className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors group">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                      <Phone className="h-3.5 w-3.5" />
                    </div>
                    <span className="truncate">{restaurant.phone}</span>
                  </a>
                )}
                {restaurant.email && (
                  <a href={`mailto:${restaurant.email}`} className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors group">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                      <Mail className="h-3.5 w-3.5" />
                    </div>
                    <span className="truncate">{restaurant.email}</span>
                  </a>
                )}
                {restaurant.totalSeats && (
                  <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Users className="h-3.5 w-3.5" />
                    </div>
                    <span>{restaurant.totalSeats} seats</span>
                  </div>
                )}
                <div className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted mt-0.5">
                    <MapPin className="h-3.5 w-3.5" />
                  </div>
                  <span className="leading-relaxed">{restaurant.address}</span>
                </div>
              </div>
            </div>

            {/* Opening hours */}
            {restaurant.openingHours && Object.keys(restaurant.openingHours).length > 0 && (
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Hours</p>
                </div>
                <OpeningHoursSection hours={restaurant.openingHours} />
              </div>
            )}

            {/* Map link */}
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border bg-card p-4 hover:bg-muted/50 transition-colors group"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Map className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">View on Google Maps</p>
                <p className="text-xs text-muted-foreground truncate">{restaurant.area}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
            </a>

          </div>
        </div>
      </div>
    </div>
  );
}

// ── section heading ───────────────────────────────────────────────────────────

function SectionHeading({ title, count, icon }: { title: string; count?: number; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      {icon && <span className="text-primary">{icon}</span>}
      <h2 className="text-base font-bold text-foreground">{title}</h2>
      {count !== undefined && (
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground font-medium">{count}</span>
      )}
    </div>
  );
}
