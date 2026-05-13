import { z } from "zod";
import { registry } from "../../docs/registry.js";

// ── Zod schemas ───────────────────────────────────────────────────────────────

export const CreatePaymentIntentBodySchema = z
  .object({
    reservationId: z.string().uuid(),
    amount: z.number().positive(),
  })
  .openapi("CreatePaymentIntentBody");

// ── Response schemas ──────────────────────────────────────────────────────────

const PaymentIntentResponseSchema = z
  .object({
    clientSecret: z.string(),
  })
  .openapi("PaymentIntentResponse");

const PaymentResponseSchema = z
  .object({
    id: z.string().uuid(),
    reservationId: z.string().uuid(),
    userId: z.string().uuid(),
    amount: z.number(),
    currency: z.string(),
    stripePaymentId: z.string().nullable(),
    status: z.enum(["PENDING", "SUCCEEDED", "FAILED", "REFUNDED"]),
    createdAt: z.string().datetime(),
  })
  .openapi("PaymentResponse");

registry.register("PaymentIntentResponse", PaymentIntentResponseSchema);
registry.register("PaymentResponse", PaymentResponseSchema);

// ── OpenAPI path registrations ────────────────────────────────────────────────

registry.registerPath({
  method: "post",
  path: "/api/payments/create-intent",
  tags: ["Payments"],
  summary: "Create a Stripe PaymentIntent for a reservation",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: CreatePaymentIntentBodySchema },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Stripe client secret for frontend confirmation",
      content: {
        "application/json": { schema: PaymentIntentResponseSchema },
      },
    },
    400: { description: "Validation error" },
    401: { description: "Unauthorized" },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/payments/webhook",
  tags: ["Payments"],
  summary:
    "Stripe webhook receiver — records payment and sends receipt email on success",
  description:
    "Called by Stripe only. Requires `stripe-signature` header. Do not call this directly.",
  request: {
    headers: z.object({
      "stripe-signature": z.string().describe("Stripe webhook signature"),
    }),
  },
  responses: {
    200: { description: "Webhook processed" },
    400: { description: "Missing signature" },
    500: { description: "Invalid signature or processing error" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/payments/history",
  tags: ["Payments"],
  summary: "Get payment history for the authenticated user",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Payment history",
      content: {
        "application/json": { schema: z.array(PaymentResponseSchema) },
      },
    },
    401: { description: "Unauthorized" },
  },
});
