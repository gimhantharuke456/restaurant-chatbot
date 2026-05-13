# Phase 08 — Payment Module

> **For agentic workers:** Use `superpowers:executing-plans` or `superpowers:subagent-driven-development` to implement task-by-task.

**Goal:** Build the payment module — Stripe PaymentIntent creation, webhook handling (`payment_intent.succeeded` + `payment_intent.payment_failed`), and payment history — with Zod validation and Swagger docs.

**Architecture:** The `/webhook` route uses `express.raw()` so Stripe can verify the request signature. All other routes use the app-level `express.json()`. Webhook receives raw `Buffer` — do not parse it before passing to `stripe.webhooks.constructEvent`.

**Tech Stack:** Stripe, Prisma, Nodemailer, Zod, @asteasolutions/zod-to-openapi

**Prerequisites:** Phase 01 (validate, registry), Phase 02 (stripe, nodemailer), Phase 03 (auth middleware)

---

## Files

| Action | Path |
|--------|------|
| Create | `src/modules/payment/payment.schema.ts` |
| Create | `src/modules/payment/payment.service.ts` |
| Create | `src/modules/payment/payment.controller.ts` |
| Create | `src/modules/payment/payment.routes.ts` |
| Modify | `src/docs/swagger.ts` |
| Modify | `src/app.ts` |

---

## Task 1: Payment schemas + OpenAPI registration

**File:** `src/modules/payment/payment.schema.ts`

- [ ] Create the file

```typescript
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
```

- [ ] Commit

```bash
git add src/modules/payment/payment.schema.ts
git commit -m "feat: add payment Zod schemas and OpenAPI path registrations"
```

---

## Task 2: Payment service

**File:** `src/modules/payment/payment.service.ts`

- [ ] Create the file

```typescript
import { stripe } from "../../config/stripe.js";
import { prisma } from "../../../lib/db.js";
import { sendEmail } from "../../config/nodemailer.js";
import type Stripe from "stripe";

export const createPaymentIntent = async (
  reservationId: string,
  amount: number,
  userId: string,
): Promise<{ clientSecret: string }> => {
  const intent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: "lkr",
    metadata: { reservationId, userId },
  });
  return { clientSecret: intent.client_secret! };
};

export const handleStripeWebhook = async (
  rawBody: Buffer,
  signature: string,
): Promise<void> => {
  const event = stripe.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!,
  );

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const { reservationId, userId } = intent.metadata;

    const payment = await prisma.payment.create({
      data: {
        reservationId,
        userId,
        amount: intent.amount / 100,
        currency: intent.currency.toUpperCase(),
        stripePaymentId: intent.id,
        status: "SUCCEEDED",
      },
      include: {
        user: true,
        reservation: { include: { restaurant: true } },
      },
    });

    sendEmail(
      payment.user.email,
      "Payment Receipt",
      `<h2>Payment Successful</h2>
       <p><strong>Restaurant:</strong> ${payment.reservation.restaurant.name}</p>
       <p><strong>Amount:</strong> LKR ${payment.amount.toFixed(2)}</p>
       <p><strong>Transaction ID:</strong> ${intent.id}</p>`,
    ).catch((err) => console.error("Receipt email failed (non-fatal):", err));
  }

  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const { reservationId, userId } = intent.metadata;

    await prisma.payment.upsert({
      where: { stripePaymentId: intent.id },
      create: {
        reservationId,
        userId,
        amount: intent.amount / 100,
        currency: intent.currency.toUpperCase(),
        stripePaymentId: intent.id,
        status: "FAILED",
      },
      update: { status: "FAILED" },
    });
  }
};

export const getPaymentHistory = async (userId: string) => {
  return prisma.payment.findMany({
    where: { userId },
    include: { reservation: { include: { restaurant: true } } },
    orderBy: { createdAt: "desc" },
  });
};
```

- [ ] Commit

```bash
git add src/modules/payment/payment.service.ts
git commit -m "feat: add payment service (Stripe intent, webhook, history)"
```

---

## Task 3: Payment controller

**File:** `src/modules/payment/payment.controller.ts`

- [ ] Create the file

```typescript
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
```

- [ ] Commit

```bash
git add src/modules/payment/payment.controller.ts
git commit -m "feat: add payment controller"
```

---

## Task 4: Payment routes

**File:** `src/modules/payment/payment.routes.ts`

- [ ] Create the file

```typescript
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
```

- [ ] Commit

```bash
git add src/modules/payment/payment.routes.ts
git commit -m "feat: add payment routes with raw body for webhook"
```

---

## Task 5: Register schema import in swagger.ts + mount router in app.ts

- [ ] Add to side-effect imports in `src/docs/swagger.ts`

```typescript
import "../modules/payment/payment.schema.js";
```

- [ ] Add payment routes to `src/app.ts`

```typescript
import paymentRoutes from "./modules/payment/payment.routes.js";
// ...
app.use("/api/payments", paymentRoutes);
```

- [ ] Verify webhook returns 400 on missing signature (not 404)

```bash
curl -X POST http://localhost:3000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{}'
# expected: 400 {"error":"Missing stripe-signature header"}
```

- [ ] Verify create-intent rejects invalid body

```bash
curl -X POST http://localhost:3000/api/payments/create-intent \
  -H "Content-Type: application/json" \
  -d '{"reservationId":"not-uuid","amount":-5}'
# expected: 400 with field errors (requires token but shows validation fires)
```

- [ ] Confirm payment routes in Swagger UI

```bash
open http://localhost:3000/api/docs
# expected: 3 payment routes with schema docs
```

- [ ] Commit

```bash
git add src/docs/swagger.ts src/app.ts
git commit -m "feat: register payment schema in Swagger and mount payment routes"
```
