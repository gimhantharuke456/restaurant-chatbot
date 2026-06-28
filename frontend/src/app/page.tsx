import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthenticatedUser } from "@/lib/server/auth";
import { serverFetch } from "@/lib/server/api";
import { HomePageClient } from "@/components/home/HomePageClient";
import { GuestChatPopup } from "@/components/GuestChatPopup";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed } from "lucide-react";
import type { RestaurantItem, MenuItem } from "@/app/(customer)/home/page";

export default async function RootPage() {
  const user = await getAuthenticatedUser();

  if (user) {
    if (user.role === "SYSTEM_ADMIN") redirect("/admin");
    if (user.role === "RESTAURANT_ADMIN") redirect("/restaurant");
    redirect("/home");
  }

  // Public landing for guests
  let restaurants: RestaurantItem[] = [];
  let featuredDishes: MenuItem[] = [];

  try {
    const result = await serverFetch<RestaurantItem[] | { data: RestaurantItem[] }>("restaurants");
    restaurants = Array.isArray(result) ? result : (result as { data: RestaurantItem[] }).data ?? [];
  } catch { /* render without data */ }

  const sample = restaurants.slice(0, 4);
  await Promise.allSettled(
    sample.map(async (r) => {
      try {
        const items = await serverFetch<MenuItem[]>(`restaurants/${r.id}/menu`);
        const available = items.filter((i) => i.isAvailable).slice(0, 3);
        available.forEach((i) => { i.restaurantName = r.name; });
        featuredDishes.push(...available);
      } catch { /* skip */ }
    })
  );
  featuredDishes = featuredDishes.sort(() => Math.random() - 0.5).slice(0, 8);

  return (
    <div className="relative">
      {/* Guest nav bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 backdrop-blur px-4 md:px-6">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <UtensilsCrossed className="h-5 w-5 text-primary" />
          <span>Restaurant Chatbot</span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign In</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/login">Get Started</Link>
          </Button>
        </div>
      </header>

      <HomePageClient restaurants={restaurants} featuredDishes={featuredDishes} />

      {/* Floating guest chat */}
      <GuestChatPopup />
    </div>
  );
}
