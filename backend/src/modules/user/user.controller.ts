import type { Response } from "express";
import type { AuthRequest } from "../../types/index.js";
import * as userService from "./user.service.js";
import {
  UpdateProfileBodySchema,
  UpdatePreferencesBodySchema,
  AddFavoriteBodySchema,
  NotificationPageQuerySchema,
} from "./user.schema.js";

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await userService.getUser(req.user!.dbId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(user);
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const body = UpdateProfileBodySchema.parse(req.body);
  const user = await userService.updateUser(req.user!.dbId, body);
  res.json(user);
};

export const getProfileWithReservations = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await userService.getUserWithReservations(req.user!.dbId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(user);
};

export const deleteAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  await userService.deleteAccount(req.user!.dbId);
  res.status(204).send();
};

export const getPreferences = async (req: AuthRequest, res: Response): Promise<void> => {
  const prefs = await userService.getDiningPreferences(req.user!.dbId);
  res.json(prefs ?? {});
};

export const updatePreferences = async (req: AuthRequest, res: Response): Promise<void> => {
  const body = UpdatePreferencesBodySchema.parse(req.body);
  const user = await userService.updateDiningPreferences(req.user!.dbId, body);
  res.json({ diningPreferences: user.diningPreferences });
};

export const getFavorites = async (req: AuthRequest, res: Response): Promise<void> => {
  const collection = typeof req.query.collection === "string" ? req.query.collection : undefined;
  const favorites = await userService.getFavorites(req.user!.dbId, collection);
  res.json(favorites);
};

export const addFavorite = async (req: AuthRequest, res: Response): Promise<void> => {
  const body = AddFavoriteBodySchema.parse(req.body);
  const fav = await userService.addFavorite(req.user!.dbId, body.restaurantId, body.collection);
  res.status(201).json(fav);
};

export const removeFavorite = async (req: AuthRequest, res: Response): Promise<void> => {
  await userService.removeFavorite(req.user!.dbId, req.params.restaurantId);
  res.status(204).send();
};

export const checkFavorite = async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await userService.checkFavorite(req.user!.dbId, req.params.restaurantId);
  res.json(result);
};

export const getUserReviews = async (req: AuthRequest, res: Response): Promise<void> => {
  const reviews = await userService.getUserReviews(req.user!.dbId);
  res.json(reviews);
};

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  const query = NotificationPageQuerySchema.parse(req.query);
  const result = await userService.getNotifications(req.user!.dbId, query);
  res.json(result);
};

export const markNotificationRead = async (req: AuthRequest, res: Response): Promise<void> => {
  await userService.markNotificationRead(req.params.id, req.user!.dbId);
  res.status(204).send();
};

export const markAllNotificationsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  await userService.markAllNotificationsRead(req.user!.dbId);
  res.status(204).send();
};

export const getUserInsights = async (req: AuthRequest, res: Response): Promise<void> => {
  const insights = await userService.getUserInsights(req.user!.dbId);
  res.json(insights);
};

export const createComplaint = async (req: AuthRequest, res: Response): Promise<void> => {
  const { subject, description, restaurantId } = req.body as { subject: string; description: string; restaurantId?: string };
  if (!subject || !description) { res.status(400).json({ error: "subject and description are required" }); return; }
  const complaint = await userService.createComplaint(req.user!.dbId, { subject, description, restaurantId });
  res.status(201).json(complaint);
};

export const getMyComplaints = async (req: AuthRequest, res: Response): Promise<void> => {
  res.json(await userService.getMyComplaints(req.user!.dbId));
};
