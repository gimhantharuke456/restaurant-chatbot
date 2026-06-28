"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, MapPin, Star, Trash2 } from "lucide-react";

interface Favorite {
  id: string;
  collection: string;
  restaurant: {
    id: string;
    name: string;
    area: string;
    avgRating: number | null;
    cuisineTypes: string;
    imageUrls: string;
    priceRange: string;
    isActive: boolean;
  };
}

const PRICE_LABEL: Record<string, string> = {
  BUDGET: "Budget", MODERATE: "Moderate", EXPENSIVE: "Expensive", FINE_DINING: "Fine Dining",
};

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/proxy/users/me/favorites")
      .then((r) => r.ok ? r.json() : [])
      .then((d) => { setFavorites(d as Favorite[]); setLoaded(true); });
  }, []);

  const remove = async (restaurantId: string) => {
    await fetch(`/api/proxy/users/me/favorites/${restaurantId}`, { method: "DELETE" });
    setFavorites((p) => p.filter((f) => f.restaurant.id !== restaurantId));
  };

  // Group by collection
  const byCollection = favorites.reduce<Record<string, Favorite[]>>((acc, f) => {
    const col = f.collection || "Saved";
    if (!acc[col]) acc[col] = [];
    acc[col].push(f);
    return acc;
  }, {});

  if (!loaded) return null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <h1 className="text-xl font-semibold">Saved Restaurants</h1>

        {favorites.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card/50 p-12 flex flex-col items-center gap-3 text-center">
            <Heart className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium text-foreground">No saved restaurants yet</p>
            <p className="text-sm text-muted-foreground">Tap the heart icon on any restaurant to save it here.</p>
            <Button asChild variant="outline" size="sm" className="mt-2">
              <Link href="/home">Browse Restaurants</Link>
            </Button>
          </div>
        ) : (
          Object.entries(byCollection).map(([collection, items]) => (
            <div key={collection} className="space-y-3">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                <h2 className="text-sm font-semibold text-foreground">{collection}</h2>
                <span className="text-xs text-muted-foreground">({items.length})</span>
              </div>
              <div className="space-y-2">
                {items.map((fav) => {
                  const r = fav.restaurant;
                  let cuisines: string[] = [];
                  try { cuisines = JSON.parse(r.cuisineTypes); } catch { cuisines = []; }
                  let images: string[] = [];
                  try { images = JSON.parse(r.imageUrls); } catch { images = []; }
                  const cover = images[0] ?? null;

                  return (
                    <div key={fav.id} className="rounded-xl border bg-card flex overflow-hidden group">
                      <Link href={`/restaurants/${r.id}`} className="flex flex-1 items-center gap-3 p-3 min-w-0">
                        <div className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-muted">
                          {cover ? (
                            <Image src={cover} alt={r.name} fill className="object-cover" unoptimized />
                          ) : (
                            <div className="flex h-full items-center justify-center text-2xl opacity-30">🍽️</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">{r.name}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{r.area}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {r.avgRating != null && (
                              <span className="flex items-center gap-0.5 text-xs text-amber-500">
                                <Star className="h-3 w-3 fill-amber-400" />
                                {r.avgRating.toFixed(1)}
                              </span>
                            )}
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {PRICE_LABEL[r.priceRange] ?? r.priceRange}
                            </Badge>
                            {cuisines.slice(0, 2).map((c) => (
                              <span key={c} className="text-[10px] text-primary">{c}</span>
                            ))}
                          </div>
                        </div>
                      </Link>
                      <button
                        onClick={() => remove(r.id)}
                        className="flex items-center justify-center w-10 border-l text-muted-foreground hover:text-red-500 hover:bg-red-500/5 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
