import { prisma } from "../../../lib/db.js";
import { adminFirestore } from "../../config/firebase.js";
import type { PriceRange, Restaurant } from "../../../generated/prisma/client.js";
import type { z } from "zod";
import type {
  RestaurantQuerySchema,
  CreateRestaurantBodySchema,
  UpdateRestaurantBodySchema,
  ReviewQuerySchema,
} from "./restaurant.schema.js";

export type RestaurantFilters = Partial<z.infer<typeof RestaurantQuerySchema>>;
export type CreateRestaurantInput = z.infer<typeof CreateRestaurantBodySchema>;
export type UpdateRestaurantInput = z.infer<typeof UpdateRestaurantBodySchema>;
export type ReviewQueryInput = z.infer<typeof ReviewQuerySchema>;

// Haversine distance in km between two lat/lng points.
const distanceKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const listRestaurants = async (filters: RestaurantFilters = {}) => {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { isActive: true };
  if (filters.area) where["area"] = { contains: filters.area, mode: "insensitive" };
  if (filters.priceRange) where["priceRange"] = filters.priceRange as PriceRange;
  if (filters.cuisine) where["cuisineTypes"] = { contains: filters.cuisine, mode: "insensitive" };
  if (filters.minRating) where["avgRating"] = { gte: filters.minRating };
  if (filters.search) {
    where["OR"] = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
      { area: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  // "Near me" mode: distance can't be computed in SQL without a spatial
  // extension, and the dataset is small (city-scale, single-digit
  // thousands at most), so sort by computed distance in JS instead.
  if (filters.lat != null && filters.lng != null) {
    const { lat, lng, radiusKm } = filters;
    const all = await prisma.restaurant.findMany({
      where: { ...where, latitude: { not: null }, longitude: { not: null } },
    });
    const withDistance = all
      .map((r) => ({ ...r, distanceKm: distanceKm(lat, lng, r.latitude!, r.longitude!) }))
      .filter((r) => radiusKm == null || r.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    const total = withDistance.length;
    const page_ = withDistance.slice(skip, skip + limit);
    return {
      data: page_.map((r) => ({ ...parseRestaurant(r), distanceKm: Math.round(r.distanceKm * 10) / 10 })),
      total,
      page,
      limit,
    };
  }

  const [restaurants, total] = await Promise.all([
    prisma.restaurant.findMany({
      where,
      orderBy: { avgRating: "desc" },
      skip,
      take: limit,
    }),
    prisma.restaurant.count({ where }),
  ]);

  return { data: restaurants.map(parseRestaurant), total, page, limit };
};

export const getRestaurantById = async (id: string) => {
  const r = await prisma.restaurant.findUnique({ where: { id } });
  return r ? parseRestaurant(r) : null;
};

export const createRestaurant = async (input: CreateRestaurantInput, adminId: string) => {
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

export const updateRestaurant = async (id: string, input: UpdateRestaurantInput) => {
  const data: Record<string, unknown> = { ...input };
  if (input.cuisineTypes) data["cuisineTypes"] = JSON.stringify(input.cuisineTypes);
  if (input.imageUrls) data["imageUrls"] = JSON.stringify(input.imageUrls);
  const r = await prisma.restaurant.update({ where: { id }, data });
  return parseRestaurant(r);
};

export const getAvailability = async (restaurantId: string, date: string): Promise<unknown[]> => {
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

export const getRestaurantReviews = async (restaurantId: string, opts: ReviewQueryInput) => {
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 10;
  const skip = (page - 1) * limit;
  const where = {
    restaurantId,
    isVisible: true,
    ...(opts.rating ? { rating: opts.rating } : {}),
  };
  const [data, total, avgAgg] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        user: { select: { name: true, avatarUrl: true } },
        reply: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.review.count({ where }),
    prisma.review.aggregate({ where: { restaurantId, isVisible: true }, _avg: { rating: true } }),
  ]);
  return { data, total, page, limit, avgRating: avgAgg._avg.rating };
};

export const getActivePromotions = async (restaurantId: string) => {
  const now = new Date();
  return prisma.promotion.findMany({
    where: { restaurantId, isActive: true, startDate: { lte: now }, endDate: { gte: now } },
    orderBy: { createdAt: "desc" },
  });
};

export const getAllActivePromotions = async () => {
  const now = new Date();
  const promotions = await prisma.promotion.findMany({
    where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
    orderBy: { createdAt: "desc" },
    include: {
      restaurant: {
        select: { id: true, name: true, area: true, cuisineTypes: true, imageUrls: true, priceRange: true },
      },
    },
  });
  return promotions.map((p) => ({
    ...p,
    restaurant: {
      ...p.restaurant,
      cuisineTypes: JSON.parse(p.restaurant.cuisineTypes) as string[],
      imageUrls: JSON.parse(p.restaurant.imageUrls) as string[],
    },
  }));
};

// ── helper ────────────────────────────────────────────────────────────────────

const parseRestaurant = (r: Restaurant) => ({
  ...r,
  cuisineTypes: JSON.parse(r.cuisineTypes) as string[],
  imageUrls: JSON.parse(r.imageUrls) as string[],
});
