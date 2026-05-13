import { prisma } from "../../../lib/db.js";
import type { User } from "../../../generated/prisma/client.js";
import type { z } from "zod";
import type { UpdateProfileBodySchema } from "./user.schema.js";

export type UpdateProfileInput = z.infer<typeof UpdateProfileBodySchema>;

export const getUser = async (id: string): Promise<User | null> => {
  return prisma.user.findUnique({ where: { id } });
};

export const updateUser = async (
  id: string,
  data: UpdateProfileInput,
): Promise<User> => {
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
