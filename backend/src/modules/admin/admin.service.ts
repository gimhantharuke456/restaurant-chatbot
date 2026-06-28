import { prisma } from "../../../lib/db.js";
import { stripe } from "../../config/stripe.js";
import type { z } from "zod";
import type { UpdateRoleBodySchema } from "./admin.schema.js";

const parseMenuItems = <T extends { dietaryInfo: string }>(item: T) => ({
  ...item,
  dietaryInfo: JSON.parse(item.dietaryInfo) as string[],
});

const parseRestaurant = <T extends { cuisineTypes: string; imageUrls: string; menuItems?: Array<{ dietaryInfo: string }> }>(r: T) => ({
  ...r,
  cuisineTypes: JSON.parse(r.cuisineTypes) as string[],
  imageUrls: JSON.parse(r.imageUrls) as string[],
  ...(r.menuItems ? { menuItems: r.menuItems.map(parseMenuItems) } : {}),
});

export type UpdateRoleInput = z.infer<typeof UpdateRoleBodySchema>;

export const getDashboardStats = async () => {
  const [
    totalUsers,
    totalRestaurants,
    activeReservations,
    totalPaymentsAgg,
    totalRevenueAgg,
    verificationPending,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.restaurant.count(),
    prisma.reservation.count({ where: { status: { in: ["PENDING", "CONFIRMED"] } } }),
    prisma.payment.count(),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: "SUCCEEDED" },
    }),
    prisma.restaurant.count({ where: { isVerified: false, isActive: true } }),
  ]);

  return {
    totalUsers,
    totalRestaurants,
    activeReservations,
    totalPayments: totalPaymentsAgg,
    totalRevenue: totalRevenueAgg._sum.amount ?? 0,
    verificationPending,
  };
};

export interface RestaurantListOptions {
  page?: number;
  limit?: number;
  search?: string;
  verified?: boolean;
  active?: boolean;
}

export const getAllRestaurants = async (opts: RestaurantListOptions = {}) => {
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (opts.search) {
    where.OR = [
      { name: { contains: opts.search, mode: "insensitive" } },
      { area: { contains: opts.search, mode: "insensitive" } },
    ];
  }
  if (opts.verified !== undefined) where.isVerified = opts.verified;
  if (opts.active !== undefined) where.isActive = opts.active;

  const [data, total] = await Promise.all([
    prisma.restaurant.findMany({
      where,
      include: { admin: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.restaurant.count({ where }),
  ]);

  return { data: data.map(parseRestaurant), total, page, limit };
};

export const getRestaurantById = async (id: string) => {
  const r = await prisma.restaurant.findUniqueOrThrow({
    where: { id },
    include: {
      admin: { select: { id: true, name: true, email: true } },
      menuItems: true,
      reviews: {
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  return parseRestaurant(r);
};

export const verifyRestaurant = async (id: string) => {
  return prisma.restaurant.update({ where: { id }, data: { isVerified: true } });
};

export const updateRestaurant = async (id: string, data: Record<string, unknown>) => {
  return prisma.restaurant.update({ where: { id }, data });
};

export const toggleRestaurantActive = async (id: string, isActive: boolean) => {
  return prisma.restaurant.update({ where: { id }, data: { isActive } });
};

export interface UserListOptions {
  page?: number;
  limit?: number;
  role?: string;
}

export const getAllUsers = async (opts: UserListOptions = {}) => {
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 20;
  const skip = (page - 1) * limit;

  const where = opts.role ? { role: opts.role as "CUSTOMER" | "RESTAURANT_ADMIN" | "SYSTEM_ADMIN" } : {};

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
        _count: { select: { reservations: true, reviews: true, managedRestaurants: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { data, total, page, limit };
};

export const getUserById = async (id: string) => {
  return prisma.user.findUniqueOrThrow({
    where: { id },
    include: {
      reservations: {
        include: { restaurant: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      managedRestaurants: { select: { id: true, name: true, isVerified: true } },
      _count: { select: { reservations: true, reviews: true, managedRestaurants: true } },
    },
  });
};

export const updateUserRole = async (id: string, data: UpdateRoleInput) => {
  return prisma.user.update({ where: { id }, data: { role: data.role } });
};

export interface ReservationListOptions {
  page?: number;
  limit?: number;
  status?: string;
  from?: string;
  to?: string;
}

export const getAllReservations = async (opts: ReservationListOptions = {}) => {
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 25;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (opts.status) where.status = opts.status;
  if (opts.from || opts.to) {
    where.date = {
      ...(opts.from ? { gte: new Date(opts.from) } : {}),
      ...(opts.to ? { lte: new Date(opts.to) } : {}),
    };
  }

  const [data, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        restaurant: { select: { id: true, name: true, area: true } },
        payment: { select: { status: true, amount: true } },
        review: { select: { id: true, rating: true, comment: true, imageUrls: true, createdAt: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.reservation.count({ where }),
  ]);

  return { data, total, page, limit };
};

export interface PaymentListOptions {
  page?: number;
  limit?: number;
  status?: string;
  from?: string;
  to?: string;
}

export const getAllPayments = async (opts: PaymentListOptions = {}) => {
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 25;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (opts.status) where.status = opts.status;
  if (opts.from || opts.to) {
    where.createdAt = {
      ...(opts.from ? { gte: new Date(opts.from) } : {}),
      ...(opts.to ? { lte: new Date(opts.to) } : {}),
    };
  }

  const [data, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        reservation: {
          select: {
            id: true,
            date: true,
            time: true,
            restaurant: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.payment.count({ where }),
  ]);

  return { data, total, page, limit };
};

export const getPaymentSummary = async () => {
  const [totalRevenueAgg, succeeded, failed, refunded] = await Promise.all([
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "SUCCEEDED" } }),
    prisma.payment.count({ where: { status: "SUCCEEDED" } }),
    prisma.payment.count({ where: { status: "FAILED" } }),
    prisma.payment.count({ where: { status: "REFUNDED" } }),
  ]);

  return {
    totalRevenue: totalRevenueAgg._sum.amount ?? 0,
    succeeded,
    failed,
    refunded,
  };
};

export const getAnalyticsReservations = async () => {
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const counts = await Promise.all(
    days.map((day) => {
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      return prisma.reservation.count({ where: { createdAt: { gte: day, lt: next } } });
    }),
  );

  return days.map((d, i) => ({ date: d.toISOString().slice(0, 10), count: counts[i] }));
};

export const getAnalyticsRevenue = async () => {
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const totals = await Promise.all(
    days.map(async (day) => {
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      const agg = await prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: "SUCCEEDED", createdAt: { gte: day, lt: next } },
      });
      return agg._sum.amount ?? 0;
    }),
  );

  return days.map((d, i) => ({ date: d.toISOString().slice(0, 10), amount: totals[i] }));
};

export const getAnalyticsCuisines = async () => {
  const restaurants = await prisma.restaurant.findMany({ select: { cuisineTypes: true, _count: { select: { reservations: true } } } });

  const tally: Record<string, number> = {};
  for (const r of restaurants) {
    const types = JSON.parse(r.cuisineTypes) as string[];
    for (const t of types) {
      tally[t] = (tally[t] ?? 0) + r._count.reservations;
    }
  }

  return Object.entries(tally)
    .map(([cuisine, count]) => ({ cuisine, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
};

export const getAnalyticsUsers = async () => {
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const counts = await Promise.all(
    days.map((day) => {
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      return prisma.user.count({ where: { createdAt: { gte: day, lt: next } } });
    }),
  );

  return days.map((d, i) => ({ date: d.toISOString().slice(0, 10), count: counts[i] }));
};

export const getAnalyticsReservationStatus = async () => {
  const statuses = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"] as const;
  const counts = await Promise.all(
    statuses.map((s) => prisma.reservation.count({ where: { status: s } })),
  );
  return statuses.map((status, i) => ({ status, count: counts[i] }));
};

interface SystemSettings {
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  maxReservationsPerDay: number;
  supportEmail: string;
  ngrokUrl: string | null;
}

let systemSettings: SystemSettings = {
  maintenanceMode: false,
  registrationEnabled: true,
  maxReservationsPerDay: 100,
  supportEmail: "support@restaurant.com",
  ngrokUrl: null,
};

export const getSettings = () => ({ ...systemSettings });

export const updateSettings = (patch: Partial<SystemSettings>) => {
  systemSettings = { ...systemSettings, ...patch };
  return { ...systemSettings };
};

export const getLogs = async (opts: { page?: number; limit?: number; search?: string } = {}) => {
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 50;
  const skip = (page - 1) * limit;

  const where = opts.search
    ? {
        OR: [
          { adminEmail: { contains: opts.search, mode: "insensitive" as const } },
          { action: { contains: opts.search, mode: "insensitive" as const } },
          { targetType: { contains: opts.search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [data, total] = await Promise.all([
    prisma.adminLog.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limit }),
    prisma.adminLog.count({ where }),
  ]);

  return { data, total, page, limit };
};

export const logAdminAction = async (
  adminId: string,
  adminEmail: string,
  action: string,
  targetType: string,
  targetId?: string,
  details?: string,
  ipAddress?: string
) => {
  await prisma.adminLog.create({
    data: { adminId, adminEmail, action, targetType, targetId, details, ipAddress },
  });
};

export const suspendUser = async (id: string) => {
  return prisma.user.update({ where: { id }, data: { isActive: false } });
};

export const activateUser = async (id: string) => {
  return prisma.user.update({ where: { id }, data: { isActive: true } });
};

export interface ReviewListOptions {
  page?: number;
  limit?: number;
  rating?: number;
  isVisible?: boolean;
}

export const getAllReviews = async (opts: ReviewListOptions = {}) => {
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 25;
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = {};
  if (opts.rating !== undefined) where.rating = opts.rating;
  if (opts.isVisible !== undefined) where.isVisible = opts.isVisible;
  const [data, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        restaurant: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.review.count({ where }),
  ]);
  return { data, total, page, limit };
};

export const hideReview = async (id: string) => {
  return prisma.review.update({ where: { id }, data: { isVisible: false } });
};

export const deleteReview = async (id: string) => {
  const review = await prisma.review.findUniqueOrThrow({ where: { id } });
  await prisma.review.delete({ where: { id } });
  const agg = await prisma.review.aggregate({
    where: { restaurantId: review.restaurantId, isVisible: true },
    _avg: { rating: true },
    _count: { id: true },
  });
  await prisma.restaurant.update({
    where: { id: review.restaurantId },
    data: { avgRating: agg._avg.rating, totalReviews: agg._count.id },
  });
};

export const refundPayment = async (paymentId: string) => {
  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
  if (payment.status !== "SUCCEEDED") {
    throw Object.assign(new Error("Only succeeded payments can be refunded"), { status: 400 });
  }
  if (!payment.stripePaymentId) {
    throw Object.assign(new Error("No Stripe payment ID"), { status: 400 });
  }
  const session = await stripe.checkout.sessions.retrieve(payment.stripePaymentId);
  const refund = await stripe.refunds.create({ payment_intent: session.payment_intent as string });
  return prisma.payment.update({
    where: { id: paymentId },
    data: { status: "REFUNDED", refundId: refund.id, refundedAt: new Date() },
  });
};

export const broadcastAnnouncement = async (title: string, message: string, role?: string) => {
  const where = role
    ? { role: role as "CUSTOMER" | "RESTAURANT_ADMIN" | "SYSTEM_ADMIN" }
    : {};
  const users = await prisma.user.findMany({ where, select: { id: true } });
  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      type: "SYSTEM_ANNOUNCEMENT" as const,
      title,
      message,
    })),
  });
  return { sent: users.length };
};

export const getAllComplaints = async (opts: { page: number; limit: number; status?: string }) => {
  const { page, limit, status } = opts;
  const where = status ? { status: status as "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "CLOSED" } : {};
  const [data, total] = await Promise.all([
    prisma.complaint.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        restaurant: { select: { name: true } },
      },
    }),
    prisma.complaint.count({ where }),
  ]);
  return { data, total, page, limit };
};

export const updateComplaint = async (
  id: string,
  updates: { status?: string; adminNote?: string },
) => {
  const data: Record<string, unknown> = {};
  if (updates.status) {
    data.status = updates.status;
    if (updates.status === "RESOLVED" || updates.status === "CLOSED") {
      data.resolvedAt = new Date();
    }
  }
  if (updates.adminNote !== undefined) data.adminNote = updates.adminNote;
  return prisma.complaint.update({
    where: { id },
    data,
    include: {
      user: { select: { name: true, email: true } },
      restaurant: { select: { name: true } },
    },
  });
};
