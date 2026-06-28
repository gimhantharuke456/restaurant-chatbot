import { prisma } from "./db.js";
import type { NotificationType } from "../generated/prisma/client.js";

export const createNotification = async (
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  data?: Record<string, unknown>,
): Promise<void> => {
  await prisma.notification
    .create({ data: { userId, type, title, message, data: (data ?? undefined) as object | undefined } })
    .catch((err: unknown) => console.error("[notification] create failed (non-fatal):", err));
};
