import { prisma } from "../../../lib/db.js";
import { adminFirestore } from "../../config/firebase.js";
import { createNotification } from "../../../lib/notifications.js";

const parseRestaurant = <T extends { cuisineTypes: string; imageUrls: string }>(r: T) => ({
  ...r,
  cuisineTypes: JSON.parse(r.cuisineTypes) as string[],
  imageUrls: JSON.parse(r.imageUrls) as string[],
});

export const registerRestaurant = async (
  adminId: string,
  input: {
    name: string;
    description?: string;
    address: string;
    area: string;
    phone?: string;
    email?: string;
    website?: string;
    cuisineTypes: string[];
    priceRange: "BUDGET" | "MODERATE" | "EXPENSIVE" | "FINE_DINING";
    openingHours: object;
    imageUrls?: string[];
    latitude?: number;
    longitude?: number;
    socialMedia?: object;
    totalSeats?: number;
  },
) => {
  const existing = await prisma.restaurant.findFirst({ where: { adminId } });
  if (existing) throw Object.assign(new Error("Restaurant already registered"), { status: 409 });
  return prisma.restaurant.create({
    data: {
      adminId,
      name: input.name,
      description: input.description ?? null,
      address: input.address,
      area: input.area,
      phone: input.phone ?? null,
      email: input.email ?? null,
      website: input.website ?? null,
      cuisineTypes: JSON.stringify(input.cuisineTypes),
      priceRange: input.priceRange,
      openingHours: input.openingHours,
      imageUrls: JSON.stringify(input.imageUrls ?? []),
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      socialMedia: input.socialMedia ?? undefined,
      totalSeats: input.totalSeats ?? null,
    },
  });
};

export const getMyRestaurant = async (adminId: string) => {
  const r = await prisma.restaurant.findFirst({ where: { adminId } });
  return r ? parseRestaurant(r) : null;
};

export const getMyStats = async (adminId: string) => {
  const restaurant = await prisma.restaurant.findFirst({ where: { adminId } });
  if (!restaurant) return null;

  const [totalReservations, activeReservations, totalRevenueAgg, pendingReservations] =
    await Promise.all([
      prisma.reservation.count({ where: { restaurantId: restaurant.id } }),
      prisma.reservation.count({
        where: { restaurantId: restaurant.id, status: { in: ["PENDING", "CONFIRMED"] } },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { reservation: { restaurantId: restaurant.id }, status: "SUCCEEDED" },
      }),
      prisma.reservation.count({
        where: { restaurantId: restaurant.id, status: "PENDING" },
      }),
    ]);

  return {
    restaurantName: restaurant.name,
    avgRating: restaurant.avgRating,
    totalReviews: restaurant.totalReviews,
    totalReservations,
    activeReservations,
    pendingReservations,
    totalRevenue: totalRevenueAgg._sum.amount ?? 0,
  };
};

export const updateMyRestaurant = async (
  adminId: string,
  data: {
    name?: string;
    description?: string;
    address?: string;
    area?: string;
    phone?: string;
    email?: string;
    website?: string;
    cuisineTypes?: string[];
    priceRange?: "BUDGET" | "MODERATE" | "EXPENSIVE" | "FINE_DINING";
    openingHours?: object;
    imageUrls?: string[];
    isActive?: boolean;
    latitude?: number;
    longitude?: number;
    socialMedia?: object;
    totalSeats?: number;
  },
) => {
  const restaurant = await prisma.restaurant.findFirst({ where: { adminId } });
  if (!restaurant) throw Object.assign(new Error("Restaurant not found"), { status: 404 });
  const updateData: Record<string, unknown> = { ...data };
  if (data.cuisineTypes) updateData.cuisineTypes = JSON.stringify(data.cuisineTypes);
  if (data.imageUrls !== undefined) updateData.imageUrls = JSON.stringify(data.imageUrls);
  return prisma.restaurant.update({ where: { id: restaurant.id }, data: updateData });
};

export const getMyReservations = async (
  adminId: string,
  opts: { page?: number; limit?: number; status?: string; from?: string; to?: string } = {},
) => {
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 25;
  const skip = (page - 1) * limit;

  const restaurant = await prisma.restaurant.findFirst({ where: { adminId } });
  if (!restaurant) return { data: [], total: 0, page, limit };

  const where = {
    restaurantId: restaurant.id,
    ...(opts.status ? { status: opts.status as never } : {}),
    ...(opts.from || opts.to
      ? {
          date: {
            ...(opts.from ? { gte: new Date(opts.from) } : {}),
            ...(opts.to ? { lte: new Date(opts.to) } : {}),
          },
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        payment: { select: { orderItems: true, amount: true, status: true } },
        review: { select: { id: true, rating: true, comment: true, imageUrls: true, createdAt: true } },
      },
      orderBy: { date: "desc" },
      skip,
      take: limit,
    }),
    prisma.reservation.count({ where }),
  ]);

  return { data, total, page, limit };
};

export const getMyMenu = async (adminId: string) => {
  const restaurant = await prisma.restaurant.findFirst({ where: { adminId } });
  if (!restaurant) return [];
  return prisma.menuItem.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
};

// ── reservation mutations ─────────────────────────────────────────────────────

const VALID_STATUSES = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"] as const;
type ReservationStatus = (typeof VALID_STATUSES)[number];

export const updateReservationStatus = async (
  adminId: string,
  reservationId: string,
  status: ReservationStatus,
) => {
  const restaurant = await prisma.restaurant.findFirst({ where: { adminId } });
  if (!restaurant) throw Object.assign(new Error("Restaurant not found"), { status: 404 });
  const reservation = await prisma.reservation.findFirst({
    where: { id: reservationId, restaurantId: restaurant.id },
  });
  if (!reservation) throw Object.assign(new Error("Reservation not found"), { status: 404 });
  return prisma.reservation.update({ where: { id: reservationId }, data: { status } });
};

export const checkInReservation = async (adminId: string, reservationId: string) => {
  const restaurant = await prisma.restaurant.findFirst({ where: { adminId } });
  if (!restaurant) throw Object.assign(new Error("Restaurant not found"), { status: 404 });
  const reservation = await prisma.reservation.findFirst({
    where: { id: reservationId, restaurantId: restaurant.id, status: "CONFIRMED" },
  });
  if (!reservation) {
    throw Object.assign(new Error("Reservation not found or not CONFIRMED"), { status: 404 });
  }
  return prisma.reservation.update({ where: { id: reservationId }, data: { status: "CHECKED_IN" } });
};

// ── reviews ───────────────────────────────────────────────────────────────────

export const getMyReviews = async (
  adminId: string,
  opts: { page?: number; limit?: number; rating?: number } = {},
) => {
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 25;
  const skip = (page - 1) * limit;

  const restaurant = await prisma.restaurant.findFirst({ where: { adminId } });
  if (!restaurant) return { data: [], total: 0, page, limit, avgRating: null };

  const where = {
    restaurantId: restaurant.id,
    ...(opts.rating ? { rating: opts.rating } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        reservation: { select: { date: true, time: true } },
        reply: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.review.count({ where }),
  ]);

  return { data, total, page, limit, avgRating: restaurant.avgRating, totalReviews: restaurant.totalReviews };
};

export const replyToReview = async (adminId: string, reviewId: string, reply: string) => {
  const restaurant = await prisma.restaurant.findFirst({ where: { adminId } });
  if (!restaurant) throw Object.assign(new Error("Restaurant not found"), { status: 404 });
  const review = await prisma.review.findFirst({ where: { id: reviewId, restaurantId: restaurant.id } });
  if (!review) throw Object.assign(new Error("Review not found"), { status: 404 });
  const result = await prisma.reviewReply.upsert({
    where: { reviewId },
    create: { reviewId, restaurantId: restaurant.id, reply },
    update: { reply },
  });
  createNotification(
    review.userId,
    "REVIEW_RECEIVED",
    "Restaurant replied to your review",
    `${restaurant.name} has responded to your review.`,
    { restaurantId: restaurant.id, reviewId },
  ).catch(() => {});
  return result;
};

// ── payments ──────────────────────────────────────────────────────────────────

export const getMyPayments = async (
  adminId: string,
  opts: { page?: number; limit?: number; status?: string } = {},
) => {
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 25;
  const skip = (page - 1) * limit;

  const restaurant = await prisma.restaurant.findFirst({ where: { adminId } });
  if (!restaurant) return { data: [], total: 0, page, limit };

  const where = {
    reservation: { restaurantId: restaurant.id },
    ...(opts.status ? { status: opts.status as never } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        reservation: { select: { id: true, date: true, time: true, partySize: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.payment.count({ where }),
  ]);

  return { data, total, page, limit };
};

// ── availability ──────────────────────────────────────────────────────────────

export interface AvailabilitySlot {
  time: string;
  totalTables: number;
  bookedTables: number;
  available: boolean;
}

export const getAvailabilityForDate = async (adminId: string, date: string): Promise<AvailabilitySlot[]> => {
  const restaurant = await prisma.restaurant.findFirst({ where: { adminId } });
  if (!restaurant) return [];
  const doc = await adminFirestore
    .collection("restaurants")
    .doc(restaurant.id)
    .collection("availability")
    .doc(date)
    .get();
  return doc.exists ? (doc.data()?.slots ?? []) : [];
};

export const setAvailabilityForDate = async (
  adminId: string,
  date: string,
  slots: AvailabilitySlot[],
) => {
  const restaurant = await prisma.restaurant.findFirst({ where: { adminId } });
  if (!restaurant) throw Object.assign(new Error("Restaurant not found"), { status: 404 });
  await adminFirestore
    .collection("restaurants")
    .doc(restaurant.id)
    .collection("availability")
    .doc(date)
    .set({ slots, updatedAt: new Date().toISOString() });
  return { restaurantId: restaurant.id, date, slots };
};

// ── promotions ────────────────────────────────────────────────────────────────

interface PromotionInput {
  title: string;
  description: string;
  type: "DISCOUNT" | "HAPPY_HOUR" | "SPECIAL_EVENT" | "SEASONAL" | "COUPON";
  discountValue?: number;
  startDate: string;
  endDate: string;
  isActive?: boolean;
  imageUrl?: string;
}

export const getMyPromotions = async (adminId: string) => {
  const restaurant = await prisma.restaurant.findFirst({ where: { adminId } });
  if (!restaurant) return [];
  return prisma.promotion.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: { createdAt: "desc" },
  });
};

export const createPromotion = async (adminId: string, input: PromotionInput) => {
  const restaurant = await prisma.restaurant.findFirst({ where: { adminId } });
  if (!restaurant) throw Object.assign(new Error("Restaurant not found"), { status: 404 });
  return prisma.promotion.create({
    data: {
      restaurantId: restaurant.id,
      title: input.title,
      description: input.description,
      type: input.type,
      discountValue: input.discountValue ?? null,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      isActive: input.isActive ?? true,
      imageUrl: input.imageUrl ?? null,
    },
  });
};

export const updatePromotion = async (
  adminId: string,
  promotionId: string,
  input: Partial<PromotionInput>,
) => {
  const restaurant = await prisma.restaurant.findFirst({ where: { adminId } });
  if (!restaurant) throw Object.assign(new Error("Restaurant not found"), { status: 404 });
  const promo = await prisma.promotion.findFirst({
    where: { id: promotionId, restaurantId: restaurant.id },
  });
  if (!promo) throw Object.assign(new Error("Promotion not found"), { status: 404 });
  return prisma.promotion.update({
    where: { id: promotionId },
    data: {
      ...(input.title && { title: input.title }),
      ...(input.description && { description: input.description }),
      ...(input.type && { type: input.type }),
      ...(input.discountValue !== undefined && { discountValue: input.discountValue }),
      ...(input.startDate && { startDate: new Date(input.startDate) }),
      ...(input.endDate && { endDate: new Date(input.endDate) }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl }),
    },
  });
};

export const deletePromotion = async (adminId: string, promotionId: string) => {
  const restaurant = await prisma.restaurant.findFirst({ where: { adminId } });
  if (!restaurant) throw Object.assign(new Error("Restaurant not found"), { status: 404 });
  const promo = await prisma.promotion.findFirst({
    where: { id: promotionId, restaurantId: restaurant.id },
  });
  if (!promo) throw Object.assign(new Error("Promotion not found"), { status: 404 });
  return prisma.promotion.delete({ where: { id: promotionId } });
};

// ── analytics ─────────────────────────────────────────────────────────────────

export const getPortalAnalytics = async (adminId: string) => {
  const restaurant = await prisma.restaurant.findFirst({ where: { adminId } });
  if (!restaurant) return null;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [reservationsByTime, payments, menuRevenue, statusBreakdown] = await Promise.all([
    prisma.reservation.groupBy({
      by: ["time"],
      where: { restaurantId: restaurant.id },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.payment.findMany({
      where: {
        reservation: { restaurantId: restaurant.id },
        status: "SUCCEEDED",
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { amount: true, orderItems: true, createdAt: true },
    }),
    prisma.payment.findMany({
      where: { reservation: { restaurantId: restaurant.id }, status: "SUCCEEDED" },
      select: { orderItems: true },
    }),
    prisma.reservation.groupBy({
      by: ["status"],
      where: { restaurantId: restaurant.id },
      _count: { id: true },
    }),
  ]);

  const itemTally: Record<string, { name: string; count: number; revenue: number }> = {};
  for (const p of menuRevenue) {
    const items = p.orderItems as Array<{ name: string; price: number; quantity: number }> | null;
    if (!items) continue;
    for (const item of items) {
      if (!itemTally[item.name]) itemTally[item.name] = { name: item.name, count: 0, revenue: 0 };
      itemTally[item.name].count += item.quantity;
      itemTally[item.name].revenue += item.price * item.quantity;
    }
  }
  const topMenuItems = Object.values(itemTally)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
  const totalRevenue = payments.reduce((s, p) => s + p.amount, 0);

  return {
    peakHours: reservationsByTime.slice(0, 10).map((r) => ({ time: r.time, count: r._count.id })),
    totalRevenue,
    topMenuItems,
    statusBreakdown: statusBreakdown.map((r) => ({ status: r.status, count: r._count.id })),
  };
};

// ── portal AI assistant ───────────────────────────────────────────────────────

export interface PortalAIMessage {
  role: "user" | "assistant";
  content: string;
}

export const askPortalAI = async (
  adminId: string,
  message: string,
  history: PortalAIMessage[] = [],
): Promise<string> => {
  const restaurant = await prisma.restaurant.findFirst({ where: { adminId } });
  if (!restaurant) throw Object.assign(new Error("Restaurant not found"), { status: 404 });

  // Gather context from existing analytics functions
  const [stats, analytics] = await Promise.all([
    getMyStats(adminId),
    getPortalAnalytics(adminId),
  ]);

  const context = {
    restaurantName: restaurant.name,
    avgRating: restaurant.avgRating,
    totalRevenue: analytics?.totalRevenue ?? 0,
    totalReservations: stats?.totalReservations ?? 0,
    activeReservations: stats?.activeReservations ?? 0,
    peakHours: analytics?.peakHours ?? [],
    topMenuItems: analytics?.topMenuItems ?? [],
    statusBreakdown: analytics?.statusBreakdown ?? [],
  };

  const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? "http://localhost:8000";
  const response = await fetch(`${AI_SERVICE_URL}/portal/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history, context }),
  });

  if (!response.ok) {
    throw Object.assign(new Error("AI service unavailable"), { status: 503 });
  }

  const data = await response.json() as { message: string };
  return data.message;
};

// ── menu mutations ────────────────────────────────────────────────────────────

interface MenuItemInput {
  name: string;
  description?: string | null;
  price: number;
  category: string;
  dietaryInfo?: string[];
  isAvailable?: boolean;
  imageUrl?: string | null;
}

export const createMenuItem = async (adminId: string, input: MenuItemInput) => {
  const restaurant = await prisma.restaurant.findFirst({ where: { adminId } });
  if (!restaurant) throw Object.assign(new Error("Restaurant not found"), { status: 404 });
  return prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      name: input.name,
      description: input.description ?? null,
      price: input.price,
      category: input.category,
      dietaryInfo: JSON.stringify(input.dietaryInfo ?? []),
      isAvailable: input.isAvailable ?? true,
      imageUrl: input.imageUrl ?? null,
    },
  });
};

export const updateMenuItem = async (
  adminId: string,
  itemId: string,
  input: Partial<MenuItemInput>,
) => {
  const restaurant = await prisma.restaurant.findFirst({ where: { adminId } });
  if (!restaurant) throw Object.assign(new Error("Restaurant not found"), { status: 404 });
  const item = await prisma.menuItem.findFirst({ where: { id: itemId, restaurantId: restaurant.id } });
  if (!item) throw Object.assign(new Error("Menu item not found"), { status: 404 });
  const data: Record<string, unknown> = { ...input };
  if (input.dietaryInfo !== undefined) data.dietaryInfo = JSON.stringify(input.dietaryInfo);
  return prisma.menuItem.update({ where: { id: itemId }, data });
};

export const deleteMenuItem = async (adminId: string, itemId: string) => {
  const restaurant = await prisma.restaurant.findFirst({ where: { adminId } });
  if (!restaurant) throw Object.assign(new Error("Restaurant not found"), { status: 404 });
  const item = await prisma.menuItem.findFirst({ where: { id: itemId, restaurantId: restaurant.id } });
  if (!item) throw Object.assign(new Error("Menu item not found"), { status: 404 });
  return prisma.menuItem.delete({ where: { id: itemId } });
};

export const getMyHolidays = async (adminId: string) => {
  const restaurant = await prisma.restaurant.findFirst({ where: { adminId } });
  if (!restaurant) return [];
  return prisma.restaurantHoliday.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: { date: "asc" },
  });
};

export const addHoliday = async (adminId: string, date: string, reason?: string) => {
  const restaurant = await prisma.restaurant.findFirst({ where: { adminId } });
  if (!restaurant) throw Object.assign(new Error("Restaurant not found"), { status: 404 });
  const d = new Date(date);
  return prisma.restaurantHoliday.upsert({
    where: { restaurantId_date: { restaurantId: restaurant.id, date: d } },
    create: { restaurantId: restaurant.id, date: d, reason: reason ?? null },
    update: { reason: reason ?? null },
  });
};

export const removeHoliday = async (adminId: string, date: string) => {
  const restaurant = await prisma.restaurant.findFirst({ where: { adminId } });
  if (!restaurant) throw Object.assign(new Error("Restaurant not found"), { status: 404 });
  await prisma.restaurantHoliday.deleteMany({
    where: { restaurantId: restaurant.id, date: new Date(date) },
  });
};
