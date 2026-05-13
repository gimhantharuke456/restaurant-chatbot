import { prisma } from "../../../lib/db.js";
import type { z } from "zod";
import type { UpdateRoleBodySchema } from "./admin.schema.js";

export type UpdateRoleInput = z.infer<typeof UpdateRoleBodySchema>;

export const getDashboardStats = async () => {
  const [users, restaurants, reservations, payments] = await Promise.all([
    prisma.user.count(),
    prisma.restaurant.count({ where: { isActive: true } }),
    prisma.reservation.count(),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: "SUCCEEDED" },
    }),
  ]);
  return {
    totalUsers: users,
    activeRestaurants: restaurants,
    totalReservations: reservations,
    totalRevenueLKR: payments._sum.amount ?? 0,
  };
};

export const getAllRestaurants = async (includeInactive = false) => {
  return prisma.restaurant.findMany({
    where: includeInactive ? {} : { isActive: true },
    include: { admin: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
};

export const verifyRestaurant = async (id: string, isVerified: boolean) => {
  return prisma.restaurant.update({ where: { id }, data: { isVerified } });
};

export const toggleRestaurantActive = async (id: string, isActive: boolean) => {
  return prisma.restaurant.update({ where: { id }, data: { isActive } });
};

export const getAllUsers = async () => {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      _count: { select: { reservations: true } },
    },
  });
};

export const updateUserRole = async (id: string, data: UpdateRoleInput) => {
  return prisma.user.update({ where: { id }, data: { role: data.role } });
};
