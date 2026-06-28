import type { Response } from "express";
import type { AuthRequest } from "../../types/index.js";
import * as portalService from "./portal.service.js";

export const getMyRestaurant = async (req: AuthRequest, res: Response): Promise<void> => {
  const r = await portalService.getMyRestaurant(req.user!.dbId);
  if (!r) { res.status(404).json({ error: "No restaurant found for this account" }); return; }
  res.json(r);
};

export const updateMyRestaurant = async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await portalService.updateMyRestaurant(req.user!.dbId, req.body as { imageUrls?: string[] });
  res.json(result);
};

export const getMyStats = async (req: AuthRequest, res: Response): Promise<void> => {
  const stats = await portalService.getMyStats(req.user!.dbId);
  if (!stats) { res.status(404).json({ error: "No restaurant found for this account" }); return; }
  res.json(stats);
};

export const getMyReservations = async (req: AuthRequest, res: Response): Promise<void> => {
  const { page, limit, status, from, to } = req.query;
  res.json(
    await portalService.getMyReservations(req.user!.dbId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status: status as string | undefined,
      from: from as string | undefined,
      to: to as string | undefined,
    }),
  );
};

export const getMyMenu = async (req: AuthRequest, res: Response): Promise<void> => {
  res.json(await portalService.getMyMenu(req.user!.dbId));
};

export const updateReservationStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  const { status } = req.body as { status: string };
  const result = await portalService.updateReservationStatus(
    req.user!.dbId,
    req.params.id,
    status as Parameters<typeof portalService.updateReservationStatus>[2],
  );
  res.json(result);
};

export const getMyReviews = async (req: AuthRequest, res: Response): Promise<void> => {
  const { page, limit, rating } = req.query;
  res.json(
    await portalService.getMyReviews(req.user!.dbId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      rating: rating ? Number(rating) : undefined,
    }),
  );
};

export const getMyPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  const { page, limit, status } = req.query;
  res.json(
    await portalService.getMyPayments(req.user!.dbId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status: status as string | undefined,
    }),
  );
};

export const updatePaymentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  const { status } = req.body as { status: string };
  const result = await portalService.updatePaymentStatus(
    req.user!.dbId,
    req.params.id,
    status,
  );
  res.json(result);
};

export const createMenuItem = async (req: AuthRequest, res: Response): Promise<void> => {
  const item = await portalService.createMenuItem(req.user!.dbId, req.body as Parameters<typeof portalService.createMenuItem>[1]);
  res.status(201).json(item);
};

export const updateMenuItem = async (req: AuthRequest, res: Response): Promise<void> => {
  const item = await portalService.updateMenuItem(req.user!.dbId, req.params.id, req.body as Parameters<typeof portalService.updateMenuItem>[2]);
  res.json(item);
};

export const deleteMenuItem = async (req: AuthRequest, res: Response): Promise<void> => {
  await portalService.deleteMenuItem(req.user!.dbId, req.params.id);
  res.status(204).end();
};

export const registerRestaurant = async (req: AuthRequest, res: Response): Promise<void> => {
  const restaurant = await portalService.registerRestaurant(req.user!.dbId, req.body as Parameters<typeof portalService.registerRestaurant>[1]);
  res.status(201).json(restaurant);
};

export const getAvailabilityForDate = async (req: AuthRequest, res: Response): Promise<void> => {
  const slots = await portalService.getAvailabilityForDate(req.user!.dbId, req.params.date);
  res.json(slots);
};

export const setAvailabilityForDate = async (req: AuthRequest, res: Response): Promise<void> => {
  const { slots } = req.body as { slots: Parameters<typeof portalService.setAvailabilityForDate>[2] };
  const result = await portalService.setAvailabilityForDate(req.user!.dbId, req.params.date, slots);
  res.json(result);
};

export const getMyPromotions = async (req: AuthRequest, res: Response): Promise<void> => {
  res.json(await portalService.getMyPromotions(req.user!.dbId));
};

export const createPromotion = async (req: AuthRequest, res: Response): Promise<void> => {
  const promo = await portalService.createPromotion(req.user!.dbId, req.body as Parameters<typeof portalService.createPromotion>[1]);
  res.status(201).json(promo);
};

export const updatePromotion = async (req: AuthRequest, res: Response): Promise<void> => {
  const promo = await portalService.updatePromotion(req.user!.dbId, req.params.id, req.body as Parameters<typeof portalService.updatePromotion>[2]);
  res.json(promo);
};

export const deletePromotion = async (req: AuthRequest, res: Response): Promise<void> => {
  await portalService.deletePromotion(req.user!.dbId, req.params.id);
  res.status(204).send();
};

export const replyToReview = async (req: AuthRequest, res: Response): Promise<void> => {
  const { reply } = req.body as { reply: string };
  if (!reply) { res.status(400).json({ error: "reply is required" }); return; }
  const result = await portalService.replyToReview(req.user!.dbId, req.params.id, reply);
  res.json(result);
};

export const getPortalAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  const analytics = await portalService.getPortalAnalytics(req.user!.dbId);
  if (!analytics) { res.status(404).json({ error: "Restaurant not found" }); return; }
  res.json(analytics);
};

export const checkInReservation = async (req: AuthRequest, res: Response): Promise<void> => {
  const reservation = await portalService.checkInReservation(req.user!.dbId, req.params.id);
  res.json(reservation);
};
