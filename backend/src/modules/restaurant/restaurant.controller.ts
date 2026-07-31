import type { Request, Response } from "express";
import type { AuthRequest } from "../../types/index.js";
import * as restaurantService from "./restaurant.service.js";
import { ReviewQuerySchema } from "./restaurant.schema.js";

export const getRestaurants = async (req: Request, res: Response): Promise<void> => {
  const result = await restaurantService.listRestaurants(
    req.query as unknown as restaurantService.RestaurantFilters,
  );
  res.json(result);
};

export const getRestaurantById = async (req: Request, res: Response): Promise<void> => {
  const r = await restaurantService.getRestaurantById(String(req.params.id));
  if (!r) { res.status(404).json({ error: "Restaurant not found" }); return; }
  res.json(r);
};

export const createRestaurant = async (req: AuthRequest, res: Response): Promise<void> => {
  const r = await restaurantService.createRestaurant(
    req.body as restaurantService.CreateRestaurantInput,
    req.user!.dbId,
  );
  res.status(201).json(r);
};

export const updateRestaurant = async (req: AuthRequest, res: Response): Promise<void> => {
  const r = await restaurantService.updateRestaurant(
    String(req.params.id),
    req.body as restaurantService.UpdateRestaurantInput,
  );
  res.json(r);
};

export const getAvailability = async (req: Request, res: Response): Promise<void> => {
  const { date } = req.query as { date: string };
  const slots = await restaurantService.getAvailability(String(req.params.id), date);
  res.json(slots);
};

export const getSlotCapacity = async (req: Request, res: Response): Promise<void> => {
  const { date } = req.query as { date: string };
  const slots = await restaurantService.getSlotCapacity(String(req.params.id), date);
  if (!slots) { res.status(404).json({ error: "Restaurant not found" }); return; }
  res.json(slots);
};

export const getMenu = async (req: Request, res: Response): Promise<void> => {
  const items = await restaurantService.getMenu(String(req.params.id));
  res.json(items);
};

export const getRestaurantReviews = async (req: Request, res: Response): Promise<void> => {
  const opts = ReviewQuerySchema.parse(req.query);
  const result = await restaurantService.getRestaurantReviews(String(req.params.id), opts);
  res.json(result);
};

export const getRestaurantPromotions = async (req: Request, res: Response): Promise<void> => {
  const promotions = await restaurantService.getActivePromotions(String(req.params.id));
  res.json(promotions);
};

export const getAllActivePromotions = async (_req: Request, res: Response): Promise<void> => {
  const promotions = await restaurantService.getAllActivePromotions();
  res.json(promotions);
};
