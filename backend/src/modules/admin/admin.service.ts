import { prisma } from "../../../lib/db.js";
import type { z } from "zod";
import type { UpdateRoleBodySchema } from "./admin.schema.js";

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

  return { data, total, page, limit };
};

export const getRestaurantById = async (id: string) => {
  return prisma.restaurant.findUniqueOrThrow({
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
