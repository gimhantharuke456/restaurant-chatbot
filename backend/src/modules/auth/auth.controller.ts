import type { Request, Response } from "express";
import type { AuthRequest } from "../../types/index.js";
import * as authService from "./auth.service.js";

export const register = async (req: Request, res: Response): Promise<void> => {
  const user = await authService.findOrCreateUser(
    req.body as authService.RegisterInput,
  );
  res.status(201).json(user);
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await authService.getUserById(req.user!.dbId);
  res.json(user);
};

export const updateProfile = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const user = await authService.updateUser(
    req.user!.dbId,
    req.body as authService.UpdateProfileInput,
  );
  res.json(user);
};
