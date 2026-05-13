import { prisma } from "../../../lib/db.js";
import { adminFirestore } from "../../config/firebase.js";
import type { PriceRange, Restaurant } from "../../../generated/prisma/client.js";
import type { z } from "zod";
import type {
  RestaurantQuerySchema,
  CreateRestaurantBodySchema,
  UpdateRestaurantBodySchema,
} from "./restaurant.schema.js";

export type RestaurantFilters = z.infer<typeof RestaurantQuerySchema>;
export type CreateRestaurantInput = z.infer<typeof CreateRestaurantBodySchema>;
export type UpdateRestaurantInput = z.infer<typeof UpdateRestaurantBodySchema>;

export const listRestaurants = async (filters: RestaurantFilters = {}) => {
  const where: Record<string, unknown> = { isActive: true };
  if (filters.area)
    where["area"] = { contains: filters.area, mode: "insensitive" };
  if (filters.priceRange) where["priceRange"] = filters.priceRange as PriceRange;

  const restaurants = await prisma.restaurant.findMany({
    where,
    orderBy: { avgRating: "desc" },
  });

  return restaurants.map(parseRestaurant);
};

export const getRestaurantById = async (id: string) => {
  const r = await prisma.restaurant.findUnique({ where: { id } });
  return r ? parseRestaurant(r) : null;
};

export const createRestaurant = async (
  input: CreateRestaurantInput,
  adminId: string,
) => {
  const r = await prisma.restaurant.create({
    data: {
      ...input,
      adminId,
      cuisineTypes: JSON.stringify(input.cuisineTypes),
      imageUrls: JSON.stringify(input.imageUrls),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      openingHours: JSON.parse(JSON.stringify(input.openingHours)),
    },
  });
  return parseRestaurant(r);
};

export const updateRestaurant = async (
  id: string,
  input: UpdateRestaurantInput,
) => {
  const data: Record<string, unknown> = { ...input };
  if (input.cuisineTypes) data["cuisineTypes"] = JSON.stringify(input.cuisineTypes);
  if (input.imageUrls) data["imageUrls"] = JSON.stringify(input.imageUrls);

  const r = await prisma.restaurant.update({ where: { id }, data });
  return parseRestaurant(r);
};

export const getAvailability = async (
  restaurantId: string,
  date: string,
): Promise<unknown[]> => {
  const doc = await adminFirestore
    .collection("restaurants")
    .doc(restaurantId)
    .collection("availability")
    .doc(date)
    .get();
  return doc.exists ? (doc.data()?.slots ?? []) : [];
};

export const getMenu = async (restaurantId: string) => {
  return prisma.menuItem.findMany({
    where: { restaurantId, isAvailable: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
};

// ── helper ────────────────────────────────────────────────────────────────────

const parseRestaurant = (r: Restaurant) => ({
  ...r,
  cuisineTypes: JSON.parse(r.cuisineTypes) as string[],
  imageUrls: JSON.parse(r.imageUrls) as string[],
});
