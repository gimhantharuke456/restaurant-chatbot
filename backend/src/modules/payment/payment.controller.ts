import type { Request, Response } from "express";
import type { AuthRequest } from "../../types/index.js";
import * as paymentService from "./payment.service.js";

export const createPaymentIntent = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const { reservationId, amount } = req.body as {
    reservationId: string;
    amount: number;
  };
  const result = await paymentService.createPaymentIntent(
    reservationId,
    amount,
    req.user!.dbId,
  );
  res.json(result);
};

export const createCheckoutSession = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const { reservationId, orderItems } = req.body as {
    reservationId: string;
    orderItems: paymentService.OrderItemInput[];
  };
  const result = await paymentService.createCheckoutSession(
    reservationId,
    req.user!.dbId,
    req.user!.email,
    orderItems,
  );
  res.status(201).json(result);
};

export const handleWebhook = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const signature = req.headers["stripe-signature"];
  if (!signature) {
    res.status(400).json({ error: "Missing stripe-signature header" });
    return;
  }
  await paymentService.handleStripeWebhook(
    req.body as Buffer,
    signature as string,
  );
  res.json({ received: true });
};

export const getPaymentHistory = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const payments = await paymentService.getPaymentHistory(req.user!.dbId);
  res.json(payments);
};
