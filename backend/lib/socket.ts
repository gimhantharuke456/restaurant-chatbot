import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import { adminAuth } from "../src/config/firebase.js";
import { prisma } from "./db.js";

let io: Server | null = null;

export const initSocketServer = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: `http://localhost:${process.env.FRONTEND_PORT || 3001}`,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) throw new Error("No token provided");

      const decoded = await adminAuth.verifyIdToken(token);
      const dbUser = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });
      if (!dbUser || !dbUser.isActive) throw new Error("Unauthorized");

      socket.data.userId = dbUser.id;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);
  });

  return io;
};

export const emitToUser = (userId: string, event: string, payload: unknown): void => {
  io?.to(`user:${userId}`).emit(event, payload);
};
