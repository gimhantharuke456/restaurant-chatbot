import type { Response } from "express";
import type { AuthRequest } from "../../types/index.js";
import * as reviewService from "./review.service.js";

export const getReview = async (req: AuthRequest, res: Response): Promise<void> => {
  const review = await reviewService.getReviewForReservation(
    String(req.params.reservationId),
    req.user!.dbId,
  );
  if (!review) { res.status(404).json({ error: "No review yet" }); return; }
  res.json(review);
};

export const createReview = async (req: AuthRequest, res: Response): Promise<void> => {
  const review = await reviewService.createReview(
    String(req.params.reservationId),
    req.user!.dbId,
    req.body,
  );
  res.status(201).json(review);
};

export const updateReview = async (req: AuthRequest, res: Response): Promise<void> => {
  const review = await reviewService.updateReview(
    String(req.params.reservationId),
    req.user!.dbId,
    req.body,
  );
  res.json(review);
};

export const deleteReview = async (req: AuthRequest, res: Response): Promise<void> => {
  await reviewService.deleteReview(String(req.params.reservationId), req.user!.dbId);
  res.status(204).send();
};
