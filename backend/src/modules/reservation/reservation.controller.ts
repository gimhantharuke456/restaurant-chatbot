import type { Response } from "express";
import type { AuthRequest } from "../../types/index.js";
import * as reservationService from "./reservation.service.js";

export const getUserReservations = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const reservations = await reservationService.getUserReservations(req.user!.dbId);
  res.json(reservations);
};

export const createReservation = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const reservation = await reservationService.createReservation(
    req.body as reservationService.CreateReservationInput,
    req.user!.dbId,
    req.user!.email,
  );
  res.status(201).json(reservation);
};

export const cancelReservation = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const reservation = await reservationService.cancelReservation(
    String(req.params.id),
    req.user!.dbId,
  );
  res.json(reservation);
};

export const updateReservation = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const reservation = await reservationService.updateReservation(
    String(req.params.id),
    req.user!.dbId,
    req.body as reservationService.UpdateReservationInput,
  );
  res.json(reservation);
};
