import type { Response } from "express";
import type { AuthRequest } from "../../types/index.js";
import * as portalService from "./portal.service.js";

export const getMyRestaurant = async (req: AuthRequest, res: Response): Promise<void> => {
  const r = await portalService.getMyRestaurant(req.user!.dbId);
  if (!r) { res.status(404).json({ error: "No restaurant found for this account" }); return; }
  res.json(r);
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
