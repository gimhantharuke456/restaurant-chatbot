import { serverFetch } from "@/lib/server/api";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Mail, Globe, Star, MessageSquare, ArrowLeft, Map, Tag, Users } from "lucide-react";
import { FavoriteButton } from "@/components/customer/FavoriteButton";
import { WaitlistJoinForm } from "@/components/customer/WaitlistJoinForm";

interface OpeningHoursDay { open?: string; close?: string; isOpen?: boolean; closed?: boolean }
type OpeningHours = Record<string, OpeningHoursDay | string | null>;

interface Restaurant {
  id: string;
  name: string;
  description: string | null;
  address: string;
  area: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  cuisineTypes: string[];
  imageUrls: string[];
  profileImageUrl: string | null;
  coverImageUrl: string | null;
  priceRange: string;
  isActive: boolean;
  isVerified: boolean;
  avgRating: number | null;
  totalReviews: number;
  totalSeats: number | null;
  latitude: number | null;
  longitude: number | null;
  openingHours: OpeningHours | null;
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  imageUrl: string | null;
  isAvailable: boolean;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: { name: string | null; avatarUrl: string | null };
  reply: { content: string } | null;
}

interface Promotion {
  id: string;
  title: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  startDate: string;
  endDate: string;
}

const PRICE_LABEL: Record<string, string> = {
  BUDGET: "Budget", MODERATE: "Moderate", EXPENSIVE: "Expensive", FINE_DINING: "Fine Dining",
};

const DAY_ORDER = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
const DAY_LABEL: Record<string, string> = {
  monday:"Mon", tuesday:"Tue", wednesday:"Wed", thursday:"Thu",
  friday:"Fri", saturday:"Sat", sunday:"Sun",
};

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
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Opening Hours</h2>
      <div className="space-y-1.5">
        {entries.map((e) => (
          <div key={e.day} className={`flex justify-between text-xs ${e.day === today ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
            <span>{e.label}{e.day === today && " (today)"}</span>
            <span>{e.closed ? "Closed" : `${e.open ?? "—"} – ${e.close ?? "—"}`}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map((n) => (
        <Star key={n} className={`h-3.5 w-3.5 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );
}

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
    serverFetch<{ data: Review[]; total: number }>(`restaurants/${id}/reviews?limit=5`).catch(() => ({ data: [], total: 0 })),
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
    <div className="h-full overflow-y-auto">
      {/* Hero */}
      <div className="relative h-56 w-full bg-muted">
        {coverImage ? (
          <Image src={coverImage} alt={restaurant.name} fill className="object-cover" unoptimized />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-20">🍽️</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute bottom-4 left-4 flex items-end gap-3">
          <Link href="/home" className="inline-flex items-center gap-1.5 rounded-lg bg-background/80 backdrop-blur px-3 py-1.5 text-sm text-foreground hover:bg-background transition">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>
        </div>
        {/* Profile image avatar anchored to bottom-right of hero */}
        {profileImage && (
          <div className="absolute bottom-0 right-4 translate-y-1/2">
            <div className="relative h-20 w-20 rounded-full overflow-hidden border-4 border-background bg-muted shadow-lg">
              <Image src={profileImage} alt={`${restaurant.name} logo`} fill className="object-cover" unoptimized />
            </div>
          </div>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-16 -mt-6 relative z-10 space-y-5">

        {/* Header card */}
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-foreground">{restaurant.name}</h1>
              <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{restaurant.area} · {restaurant.address}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <FavoriteButton restaurantId={restaurant.id} />
              <Badge variant="secondary" className="text-xs">{PRICE_LABEL[restaurant.priceRange] ?? restaurant.priceRange}</Badge>
            </div>
          </div>

          {restaurant.avgRating != null && (
            <div className="flex items-center gap-2">
              <Stars rating={Math.round(restaurant.avgRating)} />
              <span className="text-sm font-medium text-amber-500">{restaurant.avgRating.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({restaurant.totalReviews} reviews)</span>
            </div>
          )}

          {restaurant.cuisineTypes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {restaurant.cuisineTypes.map((c) => (
                <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
              ))}
            </div>
          )}

          {restaurant.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{restaurant.description}</p>
          )}

          {!restaurant.isActive && (
            <Badge variant="destructive">Temporarily Closed</Badge>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <Button asChild className="flex-1 gap-2" disabled={!restaurant.isActive}>
              <Link href={`/chat?restaurant=${encodeURIComponent(restaurant.name)}`}>
                <MessageSquare className="h-4 w-4" />
                Book a Table via AI
              </Link>
            </Button>
            {restaurant.website && (
              <Button asChild variant="outline" size="icon" title="Visit website">
                <a href={restaurant.website} target="_blank" rel="noopener noreferrer">
                  <Globe className="h-4 w-4" />
                </a>
              </Button>
            )}
            <Button asChild variant="outline" size="icon" title="View on map">
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                <Map className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>

        {/* Promotions */}
        {promotions.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              Active Offers
            </h2>
            <div className="space-y-2">
              {promotions.map((p) => (
                <div key={p.id} className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1">
                  <p className="text-sm font-semibold text-foreground">{p.title}</p>
                  {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                  <p className="text-xs text-primary font-medium">
                    {p.discountType === "PERCENTAGE" ? `${p.discountValue}% off` : `LKR ${p.discountValue} off`}
                    {" · "}Valid until {new Date(p.endDate).toLocaleDateString("en-GB")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact & Details */}
        {(restaurant.phone || restaurant.email || restaurant.totalSeats) && (
          <div className="rounded-xl border bg-card p-5 space-y-2">
            <h2 className="text-sm font-semibold text-foreground mb-3">Contact & Details</h2>
            {restaurant.phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0" />
                <a href={`tel:${restaurant.phone}`} className="hover:text-foreground transition-colors">{restaurant.phone}</a>
              </div>
            )}
            {restaurant.email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" />
                <a href={`mailto:${restaurant.email}`} className="hover:text-foreground transition-colors">{restaurant.email}</a>
              </div>
            )}
            {restaurant.website && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Globe className="h-4 w-4 shrink-0" />
                <a href={restaurant.website} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors truncate">{restaurant.website}</a>
              </div>
            )}
            {restaurant.totalSeats && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4 shrink-0" />
                <span>Capacity: {restaurant.totalSeats} seats</span>
              </div>
            )}
          </div>
        )}

        {/* Opening Hours */}
        {restaurant.openingHours && Object.keys(restaurant.openingHours).length > 0 && (
          <OpeningHoursSection hours={restaurant.openingHours} />
        )}

        {/* Map */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Map className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">View on Google Maps</p>
              <p className="text-xs text-muted-foreground truncate">{restaurant.address}</p>
            </div>
            <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
          </a>
        </div>

        {/* Photo gallery */}
        {restaurant.imageUrls.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Photos</h2>
            <div className="grid grid-cols-3 gap-2">
              {restaurant.imageUrls.slice(0, 9).map((url, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                  <Image src={url} alt="" fill className="object-cover" unoptimized />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Menu */}
        {Object.keys(byCategory).length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Menu</h2>
            {Object.entries(byCategory).map(([category, items]) => (
              <div key={category} className="rounded-xl border bg-card overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/50 border-b">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{category}</span>
                </div>
                <div className="divide-y">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                      {item.imageUrl && (
                        <div className="relative h-14 w-14 shrink-0 rounded-lg overflow-hidden bg-muted">
                          <Image src={item.imageUrl} alt={item.name} fill className="object-cover" unoptimized />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-foreground leading-tight">{item.name}</p>
                          <span className="text-sm font-semibold text-primary shrink-0">LKR {item.price.toLocaleString()}</span>
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                        )}
                        {!item.isAvailable && (
                          <span className="text-[10px] text-red-500 font-medium">Unavailable</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Waitlist */}
        <WaitlistJoinForm restaurantId={restaurant.id} restaurantName={restaurant.name} />

        {/* Reviews */}
        {reviewsData.data.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Reviews</h2>
              <span className="text-xs text-muted-foreground">{reviewsData.total} total</span>
            </div>
            <div className="space-y-3">
              {reviewsData.data.map((review) => (
                <div key={review.id} className="rounded-xl border bg-card p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                        {(review.user.name ?? "U")[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-foreground">{review.user.name ?? "Anonymous"}</span>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <Stars rating={review.rating} />
                      <span className="text-[10px] text-muted-foreground">{new Date(review.createdAt).toLocaleDateString("en-GB")}</span>
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{review.comment}</p>
                  )}
                  {review.reply && (
                    <div className="rounded-lg bg-muted px-3 py-2 space-y-0.5">
                      <p className="text-[10px] font-semibold text-primary">Restaurant reply</p>
                      <p className="text-xs text-muted-foreground">{review.reply.content}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
