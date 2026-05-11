import { prisma } from "../utils/prisma";
import { RESTAURANT_DEFINITIONS } from "../constants/restaurants";
import { randomAddress } from "../constants/colombo";
import { SeedUser, SeedRestaurant } from "../types";
import { Prisma } from "@prisma/client";

export async function seedRestaurants(adminUsers: SeedUser[]): Promise<SeedRestaurant[]> {
  console.log("  Seeding restaurants...");

  const restaurantAdmins = adminUsers.filter(
    (u) => u.role === "RESTAURANT_ADMIN",
  );

  const restaurants: Prisma.RestaurantCreateManyInput[] = RESTAURANT_DEFINITIONS.map((def, i) => ({
    ...def,
    address: randomAddress(def.area),
    isActive: true,
    isVerified: true,
    adminId: restaurantAdmins[i % restaurantAdmins.length].id,
    imageUrls: [],
  }));

  await prisma.restaurant.createMany({
    data: restaurants,
    skipDuplicates: true,
  });

  const created = await prisma.restaurant.findMany({
    orderBy: { createdAt: "asc" },
    include: { admin: true },
  });

  console.log(`  ✓ ${created.length} restaurants created`);
  return created;
}
