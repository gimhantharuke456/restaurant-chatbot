import type { Response } from "express";
import type { AuthRequest } from "../../types/index.js";
import * as userService from "./user.service.js";

export const getProfile = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const user = await userService.getUser(req.user!.dbId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(user);
};

export const updateProfile = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const user = await userService.updateUser(
    req.user!.dbId,
    req.body as userService.UpdateProfileInput,
  );
  res.json(user);
};

export const getProfileWithReservations = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const user = await userService.getUserWithReservations(req.user!.dbId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(user);
};
