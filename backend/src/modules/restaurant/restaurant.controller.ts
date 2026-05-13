import type { Request, Response } from "express";
import type { AuthRequest } from "../../types/index.js";
import * as restaurantService from "./restaurant.service.js";

export const getRestaurants = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const restaurants = await restaurantService.listRestaurants(
    req.query as restaurantService.RestaurantFilters,
  );
  res.json(restaurants);
};

export const getRestaurantById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const r = await restaurantService.getRestaurantById(String(req.params.id));
  if (!r) {
    res.status(404).json({ error: "Restaurant not found" });
    return;
  }
  res.json(r);
};

export const createRestaurant = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const r = await restaurantService.createRestaurant(
    req.body as restaurantService.CreateRestaurantInput,
    req.user!.dbId,
  );
  res.status(201).json(r);
};

export const updateRestaurant = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const r = await restaurantService.updateRestaurant(
    String(req.params.id),
    req.body as restaurantService.UpdateRestaurantInput,
  );
  res.json(r);
};

export const getAvailability = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { date } = req.query as { date: string };
  const slots = await restaurantService.getAvailability(String(req.params.id), date);
  res.json(slots);
};

export const getMenu = async (req: Request, res: Response): Promise<void> => {
  const items = await restaurantService.getMenu(String(req.params.id));
  res.json(items);
};
