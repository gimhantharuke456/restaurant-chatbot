import { Router } from "express";
import express from "express";
import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { CreatePaymentIntentBodySchema } from "./payment.schema.js";
import * as paymentController from "./payment.controller.js";

const router = Router();

router.post(
  "/create-intent",
  authenticate,
  validate(CreatePaymentIntentBodySchema),
  paymentController.createPaymentIntent,
);

// express.raw() replaces express.json() for this route only
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  paymentController.handleWebhook,
);

router.get("/history", authenticate, paymentController.getPaymentHistory);

export default router;
