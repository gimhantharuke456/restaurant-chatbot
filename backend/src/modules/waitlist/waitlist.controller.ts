import type { Response } from "express";
import type { AuthRequest } from "../../types/index.js";
import * as waitlistService from "./waitlist.service.js";
import { z } from "zod";

const JoinSchema = z.object({
  restaurantId: z.string().uuid(),
  date: z.string(),
  time: z.string(),
  partySize: z.number().int().min(1).max(20),
});

export const joinWaitlist = async (req: AuthRequest, res: Response): Promise<void> => {
  const body = JoinSchema.parse(req.body);
  const entry = await waitlistService.joinWaitlist(req.user!.dbId, body);
  res.status(201).json(entry);
};

export const getMyWaitlist = async (req: AuthRequest, res: Response): Promise<void> => {
  const entries = await waitlistService.getMyWaitlist(req.user!.dbId);
  res.json(entries);
};

export const leaveWaitlist = async (req: AuthRequest, res: Response): Promise<void> => {
  await waitlistService.leaveWaitlist(req.params.id, req.user!.dbId);
  res.status(204).send();
};
