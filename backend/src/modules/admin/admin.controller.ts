import type { Request, Response } from "express";
import * as adminService from "./admin.service.js";

export const getDashboardStats = async (_req: Request, res: Response): Promise<void> => {
  res.json(await adminService.getDashboardStats());
};

export const getAllRestaurants = async (req: Request, res: Response): Promise<void> => {
  const { page, limit, search, verified, active } = req.query;
  res.json(
    await adminService.getAllRestaurants({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search: search as string | undefined,
      verified: verified !== undefined ? verified === "true" : undefined,
      active: active !== undefined ? active === "true" : undefined,
    }),
  );
};

export const getRestaurantById = async (req: Request, res: Response): Promise<void> => {
  res.json(await adminService.getRestaurantById(req.params.id));
};

// POST /admin/restaurants/:id/verify — sets isVerified: true
export const verifyRestaurant = async (req: Request, res: Response): Promise<void> => {
  res.json(await adminService.verifyRestaurant(req.params.id));
};

// PATCH /admin/restaurants/:id — general field update (handles isActive toggle too)
export const updateRestaurant = async (req: Request, res: Response): Promise<void> => {
  res.json(await adminService.updateRestaurant(req.params.id, req.body as Record<string, unknown>));
};

// PATCH /admin/restaurants/:id/active — legacy route kept for compat
export const toggleRestaurantActive = async (req: Request, res: Response): Promise<void> => {
  res.json(await adminService.toggleRestaurantActive(req.params.id, req.body.isActive as boolean));
};

export const getAllReservations = async (req: Request, res: Response): Promise<void> => {
  const { page, limit, status, from, to } = req.query;
  res.json(
    await adminService.getAllReservations({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status: status as string | undefined,
      from: from as string | undefined,
      to: to as string | undefined,
    }),
  );
};

export const getAllPayments = async (req: Request, res: Response): Promise<void> => {
  const { page, limit, status, from, to } = req.query;
  res.json(
    await adminService.getAllPayments({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status: status as string | undefined,
      from: from as string | undefined,
      to: to as string | undefined,
    }),
  );
};

export const getPaymentSummary = async (_req: Request, res: Response): Promise<void> => {
  res.json(await adminService.getPaymentSummary());
};

export const getLogs = async (req: Request, res: Response): Promise<void> => {
  const { page, limit, search } = req.query;
  res.json(
    await adminService.getLogs({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search: search as string | undefined,
    }),
  );
};

export const getSettings = async (_req: Request, res: Response): Promise<void> => {
  res.json(adminService.getSettings());
};

export const updateSettings = async (req: Request, res: Response): Promise<void> => {
  res.json(adminService.updateSettings(req.body as Parameters<typeof adminService.updateSettings>[0]));
};

export const getAnalyticsReservations = async (_req: Request, res: Response): Promise<void> => {
  res.json(await adminService.getAnalyticsReservations());
};

export const getAnalyticsRevenue = async (_req: Request, res: Response): Promise<void> => {
  res.json(await adminService.getAnalyticsRevenue());
};

export const getAnalyticsCuisines = async (_req: Request, res: Response): Promise<void> => {
  res.json(await adminService.getAnalyticsCuisines());
};

export const getAnalyticsUsers = async (_req: Request, res: Response): Promise<void> => {
  res.json(await adminService.getAnalyticsUsers());
};

export const getAnalyticsReservationStatus = async (_req: Request, res: Response): Promise<void> => {
  res.json(await adminService.getAnalyticsReservationStatus());
};

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  const { page, limit, role } = req.query;
  res.json(
    await adminService.getAllUsers({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      role: role as string | undefined,
    }),
  );
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  res.json(await adminService.getUserById(req.params.id));
};

export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  res.json(await adminService.updateUserRole(req.params.id, req.body as adminService.UpdateRoleInput));
};
