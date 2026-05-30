import { prisma } from "../../../lib/db.js";

const parseRestaurant = <T extends { cuisineTypes: string; imageUrls: string }>(r: T) => ({
  ...r,
  cuisineTypes: JSON.parse(r.cuisineTypes) as string[],
  imageUrls: JSON.parse(r.imageUrls) as string[],
});

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
      ? { date: { ...(opts.from ? { gte: new Date(opts.from) } : {}), ...(opts.to ? { lte: new Date(opts.to) } : {}) } }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true, phone: true } } },
      orderBy: { date: "asc" },
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

  const item = await prisma.menuItem.findFirst({
    where: { id: itemId, restaurantId: restaurant.id },
  });
  if (!item) throw Object.assign(new Error("Menu item not found"), { status: 404 });

  const data: Record<string, unknown> = { ...input };
  if (input.dietaryInfo !== undefined) data.dietaryInfo = JSON.stringify(input.dietaryInfo);

  return prisma.menuItem.update({ where: { id: itemId }, data });
};

export const deleteMenuItem = async (adminId: string, itemId: string) => {
  const restaurant = await prisma.restaurant.findFirst({ where: { adminId } });
  if (!restaurant) throw Object.assign(new Error("Restaurant not found"), { status: 404 });

  const item = await prisma.menuItem.findFirst({
    where: { id: itemId, restaurantId: restaurant.id },
  });
  if (!item) throw Object.assign(new Error("Menu item not found"), { status: 404 });

  return prisma.menuItem.delete({ where: { id: itemId } });
};
