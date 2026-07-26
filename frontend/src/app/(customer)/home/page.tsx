import { serverFetch } from "@/lib/server/api";
import { HomePageClient } from "@/components/home/HomePageClient";

export interface RestaurantItem {
  id: string;
  name: string;
  description: string | null;
  area: string;
  cuisineTypes: string[];
  imageUrls: string[];
  profileImageUrl: string | null;
  coverImageUrl: string | null;
  priceRange: string;
  avgRating: number | null;
  totalReviews: number;
  distanceKm?: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  imageUrl: string | null;
  dietaryInfo: string;
  isAvailable: boolean;
  restaurantName?: string;
}

export default async function HomePage() {
  let restaurants: RestaurantItem[] = [];
  let featuredDishes: MenuItem[] = [];

  try {
    const result = await serverFetch<RestaurantItem[] | { data: RestaurantItem[] }>("restaurants");
    restaurants = Array.isArray(result) ? result : (result as { data: RestaurantItem[] }).data ?? [];
  } catch { /* render without data */ }

  // Fetch menus from up to 4 restaurants for the featured dishes section
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

  // Shuffle and cap at 8
  featuredDishes = featuredDishes
    .sort(() => Math.random() - 0.5)
    .slice(0, 8);

  return <HomePageClient restaurants={restaurants} featuredDishes={featuredDishes} />;
}
