import { prisma } from "../../../lib/db.js";
import { createNotification } from "../../../lib/notifications.js";

interface JoinWaitlistInput {
  restaurantId: string;
  date: string;
  time: string;
  partySize: number;
}

export const joinWaitlist = async (userId: string, input: JoinWaitlistInput) => {
  const existing = await prisma.waitlist.findFirst({
    where: {
      userId,
      restaurantId: input.restaurantId,
      date: new Date(input.date),
      time: input.time,
      status: "WAITING",
    },
  });
  if (existing) throw Object.assign(new Error("Already on waitlist for this slot"), { status: 409 });

  const position =
    (await prisma.waitlist.count({
      where: {
        restaurantId: input.restaurantId,
        date: new Date(input.date),
        time: input.time,
        status: "WAITING",
      },
    })) + 1;

  return prisma.waitlist.create({
    data: {
      userId,
      restaurantId: input.restaurantId,
      date: new Date(input.date),
      time: input.time,
      partySize: input.partySize,
      position,
    },
    include: { restaurant: { select: { name: true } } },
  });
};

export const getMyWaitlist = async (userId: string) => {
  return prisma.waitlist.findMany({
    where: { userId, status: { in: ["WAITING", "NOTIFIED"] } },
    include: { restaurant: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
};

export const leaveWaitlist = async (id: string, userId: string) => {
  const entry = await prisma.waitlist.findUnique({ where: { id } });
  if (!entry) throw Object.assign(new Error("Waitlist entry not found"), { status: 404 });
  if (entry.userId !== userId) throw Object.assign(new Error("Forbidden"), { status: 403 });
  if (!["WAITING", "NOTIFIED"].includes(entry.status)) {
    throw Object.assign(new Error("Cannot leave waitlist in current status"), { status: 400 });
  }
  await prisma.waitlist.update({ where: { id }, data: { status: "EXPIRED" } });
};

export const notifyWaitlistForSlot = async (
  restaurantId: string,
  date: string,
  time: string,
): Promise<number> => {
  const entries = await prisma.waitlist.findMany({
    where: { restaurantId, date: new Date(date), time, status: "WAITING" },
    include: { restaurant: { select: { name: true } } },
    orderBy: { position: "asc" },
    take: 3,
  });
  for (const entry of entries) {
    await prisma.waitlist.update({
      where: { id: entry.id },
      data: { status: "NOTIFIED", notifiedAt: new Date() },
    });
    await createNotification(
      entry.userId,
      "WAITLIST_AVAILABLE",
      "A table is now available!",
      `A slot opened up at ${entry.restaurant.name} on ${date} at ${time}. Book now before it fills up!`,
      { restaurantId, date, time },
    );
  }
  return entries.length;
};
