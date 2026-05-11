import { prisma } from "../utils/prisma";
import { MENU_ITEMS } from "../constants/cuisine";
import { randomInt, randomFloat } from "../utils/faker";
import { SeedRestaurant, SeedMenuItem } from "../types";
import { Prisma } from "@prisma/client";

export async function seedMenuItems(restaurants: SeedRestaurant[]): Promise<SeedMenuItem[]> {
  console.log("  Seeding menu items...");

  const allItems: Prisma.MenuItemCreateManyInput[] = [];

  for (const restaurant of restaurants) {
    const primaryCuisine = restaurant.cuisineTypes[0] as string;
    const cuisineItems = MENU_ITEMS[primaryCuisine] || MENU_ITEMS["Sri Lankan"];

    // use all defined items for this cuisine + add some extras from secondary cuisine
    const primaryItems: Prisma.MenuItemCreateManyInput[] = cuisineItems.map((item) => ({
      restaurantId: restaurant.id,
      name: item.name,
      description: item.desc,
      price: randomFloat(item.priceMin, item.priceMax, 0),
      category: item.category,
      dietaryInfo: item.dietary,
      isAvailable: Math.random() > 0.05, // 95% available
    }));

    // if restaurant has secondary cuisine, add a few items from it
    if (restaurant.cuisineTypes.length > 1) {
      const secondaryCuisine = restaurant.cuisineTypes[1] as string;
      const secondaryItems: Prisma.MenuItemCreateManyInput[] = (MENU_ITEMS[secondaryCuisine] || [])
        .slice(0, randomInt(2, 4))
        .map((item) => ({
          restaurantId: restaurant.id,
          name: item.name,
          description: item.desc,
          price: randomFloat(item.priceMin, item.priceMax, 0),
          category: item.category,
          dietaryInfo: item.dietary,
          isAvailable: Math.random() > 0.05,
        }));
      allItems.push(...secondaryItems);
    }

    allItems.push(...primaryItems);
  }

  await prisma.menuItem.createMany({ data: allItems, skipDuplicates: true });

  const count = await prisma.menuItem.count();
  console.log(`  ✓ ${count} menu items created`);

  return prisma.menuItem.findMany({ include: { restaurant: true } });
}
