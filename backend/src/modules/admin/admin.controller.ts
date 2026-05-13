import type { Request, Response } from "express";
import * as adminService from "./admin.service.js";

export const getDashboardStats = async (_req: Request, res: Response): Promise<void> => {
  res.json(await adminService.getDashboardStats());
};

export const getAllRestaurants = async (req: Request, res: Response): Promise<void> => {
  res.json(await adminService.getAllRestaurants(req.query.includeInactive === "true"));
};

export const verifyRestaurant = async (req: Request, res: Response): Promise<void> => {
  res.json(await adminService.verifyRestaurant(req.params.id, req.body.isVerified as boolean));
};

export const toggleRestaurantActive = async (req: Request, res: Response): Promise<void> => {
  res.json(await adminService.toggleRestaurantActive(req.params.id, req.body.isActive as boolean));
};

export const getAllUsers = async (_req: Request, res: Response): Promise<void> => {
  res.json(await adminService.getAllUsers());
};

export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  res.json(await adminService.updateUserRole(req.params.id, req.body as adminService.UpdateRoleInput));
};
