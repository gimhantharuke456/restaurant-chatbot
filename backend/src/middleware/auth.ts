import type { Response, NextFunction } from "express";
import { adminAuth } from "../config/firebase.js";
import { prisma } from "../../lib/db.js";
import type { AuthRequest } from "../types/index.js";

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const token = req.headers.authorization?.split("Bearer ")[1];
  if (!token) {
    res.status(401).json({ error: "No token provided" });
    return;
  }

  const decoded = await adminAuth.verifyIdToken(token);
  const dbUser = await prisma.user.findUnique({
    where: { firebaseUid: decoded.uid },
  });

  if (!dbUser) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  if (!dbUser.isActive) {
    res.status(403).json({ error: "Account suspended" });
    return;
  }

  req.user = {
    uid: decoded.uid,
    email: decoded.email!,
    role: dbUser.role,
    dbId: dbUser.id,
  };
  next();
};

export const requireRole =
  (...roles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
