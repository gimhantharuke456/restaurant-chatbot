import { prisma } from "../../../lib/db.js";
import type { User } from "../../../generated/prisma/client.js";
import type { z } from "zod";
import type {
  UpdateProfileBodySchema,
  UpdatePreferencesBodySchema,
} from "./user.schema.js";

export type UpdateProfileInput = z.infer<typeof UpdateProfileBodySchema>;
export type UpdatePreferencesInput = z.infer<typeof UpdatePreferencesBodySchema>;

export const getUser = async (id: string): Promise<User | null> => {
  return prisma.user.findUnique({ where: { id } });
};

export const updateUser = async (id: string, data: UpdateProfileInput): Promise<User> => {
  return prisma.user.update({ where: { id }, data });
};

export const getUserWithReservations = async (id: string) => {
  return prisma.user.findUnique({
    where: { id },
    include: {
      reservations: {
        include: { restaurant: true },
        orderBy: { date: "desc" },
        take: 10,
      },
    },
  });
};

export const getDiningPreferences = async (id: string) => {
  const user = await prisma.user.findUnique({ where: { id }, select: { diningPreferences: true } });
  return user?.diningPreferences ?? null;
};

export const updateDiningPreferences = async (id: string, input: UpdatePreferencesInput) => {
  return prisma.user.update({ where: { id }, data: { diningPreferences: input as object } });
};

export const getFavorites = async (userId: string, collection?: string) => {
  return prisma.favorite.findMany({
    where: { userId, ...(collection ? { collection } : {}) },
    include: {
      restaurant: {
        select: {
          id: true,
          name: true,
          area: true,
          avgRating: true,
          cuisineTypes: true,
          imageUrls: true,
          priceRange: true,
          isActive: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const addFavorite = async (userId: string, restaurantId: string, collection: string) => {
  return prisma.favorite.upsert({
    where: { userId_restaurantId: { userId, restaurantId } },
    create: { userId, restaurantId, collection },
    update: { collection },
  });
};

export const removeFavorite = async (userId: string, restaurantId: string) => {
  await prisma.favorite.deleteMany({ where: { userId, restaurantId } });
};

export const checkFavorite = async (userId: string, restaurantId: string) => {
  const fav = await prisma.favorite.findUnique({
    where: { userId_restaurantId: { userId, restaurantId } },
  });
  return { isFavorited: !!fav, collection: fav?.collection ?? null };
};

export const getUserReviews = async (userId: string) => {
  return prisma.review.findMany({
    where: { userId, isVisible: true },
    include: {
      restaurant: { select: { id: true, name: true, imageUrls: true } },
      reply: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

export const getNotifications = async (
  userId: string,
  opts: { page?: number; limit?: number } = {},
) => {
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 20;
  const skip = (page - 1) * limit;
  const [data, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);
  return { data, total, page, limit, unreadCount };
};

export const markNotificationRead = async (id: string, userId: string) => {
  return prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
};

export const markAllNotificationsRead = async (userId: string) => {
  return prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
};

export const getUserInsights = async (userId: string) => {
  const [reservations, reviews, totalSpentAgg] = await Promise.all([
    prisma.reservation.findMany({
      where: { userId, status: { in: ["COMPLETED", "CHECKED_IN"] } },
      include: { restaurant: { select: { name: true, cuisineTypes: true } } },
    }),
    prisma.review.findMany({ where: { userId }, select: { rating: true } }),
    prisma.payment.aggregate({ where: { userId, status: "SUCCEEDED" }, _sum: { amount: true } }),
  ]);

  const cuisineTally: Record<string, number> = {};
  const restaurantTally: Record<string, { name: string; count: number }> = {};
  const monthTally: Record<string, number> = {};

  for (const r of reservations) {
    const types: string[] = JSON.parse(r.restaurant.cuisineTypes);
    for (const c of types) cuisineTally[c] = (cuisineTally[c] ?? 0) + 1;
    restaurantTally[r.restaurantId] = {
      name: r.restaurant.name,
      count: (restaurantTally[r.restaurantId]?.count ?? 0) + 1,
    };
    const month = r.date.toISOString().slice(0, 7);
    monthTally[month] = (monthTally[month] ?? 0) + 1;
  }

  const topCuisines = Object.entries(cuisineTally)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cuisine, count]) => ({ cuisine, count }));

  const topRestaurants = Object.entries(restaurantTally)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([id, { name, count }]) => ({ id, name, count }));

  const monthlyDining = Object.entries(monthTally)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, count]) => ({ month, count }));

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null;

  return {
    totalDiningExperiences: reservations.length,
    totalSpent: totalSpentAgg._sum.amount ?? 0,
    avgRatingGiven: avgRating,
    topCuisines,
    topRestaurants,
    monthlyDining,
  };
};

export const deleteAccount = async (userId: string) => {
  await prisma.user.delete({ where: { id: userId } });
};

export const createComplaint = async (
  userId: string,
  input: { subject: string; description: string; restaurantId?: string },
) => {
  return prisma.complaint.create({
    data: {
      userId,
      subject: input.subject,
      description: input.description,
      restaurantId: input.restaurantId ?? null,
    },
    include: { restaurant: { select: { name: true } } },
  });
};

export const getMyComplaints = async (userId: string) => {
  return prisma.complaint.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { restaurant: { select: { name: true } } },
  });
};
