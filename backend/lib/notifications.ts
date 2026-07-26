import { prisma } from "./db.js";
import { adminMessaging } from "../src/config/firebase.js";
import { emitToUser } from "./socket.js";
import type { NotificationType } from "../generated/prisma/client.js";

export const createNotification = async (
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  data?: Record<string, unknown>,
): Promise<void> => {
  const notification = await prisma.notification
    .create({ data: { userId, type, title, message, data: (data ?? undefined) as object | undefined } })
    .catch((err: unknown) => {
      console.error("[notification] create failed (non-fatal):", err);
      return null;
    });

  if (notification) {
    emitToUser(userId, "notification:new", {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      isRead: notification.isRead,
      createdAt: notification.createdAt.toISOString(),
    });
  }

  // FCM push — best-effort, non-blocking
  prisma.deviceToken
    .findMany({ where: { userId }, select: { token: true } })
    .then(async (rows) => {
      if (!rows.length) return;
      const tokens = rows.map((r) => r.token);
      await adminMessaging.sendEachForMulticast({
        tokens,
        notification: { title, body: message },
        data: data ? { payload: JSON.stringify(data) } : undefined,
        android: { priority: "high" },
        apns: { payload: { aps: { sound: "default" } } },
      });
    })
    .catch((err: unknown) => console.error("[notification] FCM push failed (non-fatal):", err));
};
