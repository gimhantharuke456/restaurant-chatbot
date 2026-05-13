# Phase 07 — Reservation Module

> **For agentic workers:** Use `superpowers:executing-plans` or `superpowers:subagent-driven-development` to implement task-by-task.

**Goal:** Build the reservation module — create (Postgres + Firestore slot sync + confirmation email), cancel, update, list — all with Zod validation and Swagger docs.

**Architecture:** Service performs all side effects in sequence. Firestore and email failures are logged but non-fatal — the Postgres record is the source of truth. The Firestore slot update is a read-modify-write (acceptable for MVP concurrency).

**Tech Stack:** Prisma, Firebase Admin (Firestore), Nodemailer, Zod, @asteasolutions/zod-to-openapi

**Prerequisites:** Phase 01 (validate, registry), Phase 02 (firebase, nodemailer), Phase 03 (auth middleware)

---

## Files

| Action | Path |
|--------|------|
| Create | `src/modules/reservation/reservation.schema.ts` |
| Create | `src/modules/reservation/reservation.service.ts` |
| Create | `src/modules/reservation/reservation.controller.ts` |
| Create | `src/modules/reservation/reservation.routes.ts` |
| Modify | `src/docs/swagger.ts` |
| Modify | `src/app.ts` |

---

## Task 1: Reservation schemas + OpenAPI registration

**File:** `src/modules/reservation/reservation.schema.ts`

- [ ] Create the file

```typescript
import { z } from "zod";
import { registry } from "../../docs/registry.js";

// ── Zod schemas ───────────────────────────────────────────────────────────────

export const CreateReservationBodySchema = z
  .object({
    restaurantId: z.string().uuid(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
    time: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM"),
    partySize: z.number().int().min(1).max(20),
    specialRequests: z.string().max(500).optional(),
  })
  .openapi("CreateReservationBody");

export const UpdateReservationBodySchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    partySize: z.number().int().min(1).max(20).optional(),
    specialRequests: z.string().max(500).optional(),
  })
  .openapi("UpdateReservationBody");

// ── Response schema ───────────────────────────────────────────────────────────

const ReservationResponseSchema = z
  .object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    restaurantId: z.string().uuid(),
    date: z.string().datetime(),
    time: z.string(),
    partySize: z.number(),
    specialRequests: z.string().nullable(),
    status: z.enum([
      "PENDING",
      "CONFIRMED",
      "CANCELLED",
      "COMPLETED",
      "NO_SHOW",
    ]),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("ReservationResponse");

registry.register("ReservationResponse", ReservationResponseSchema);

// ── OpenAPI path registrations ────────────────────────────────────────────────

registry.registerPath({
  method: "get",
  path: "/api/reservations",
  tags: ["Reservations"],
  summary: "List all reservations for the authenticated user",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "User reservations",
      content: {
        "application/json": { schema: z.array(ReservationResponseSchema) },
      },
    },
    401: { description: "Unauthorized" },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/reservations",
  tags: ["Reservations"],
  summary: "Create a reservation — syncs to Firestore and sends confirmation email",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: CreateReservationBodySchema },
      },
      required: true,
    },
  },
  responses: {
    201: {
      description: "Reservation confirmed",
      content: { "application/json": { schema: ReservationResponseSchema } },
    },
    400: { description: "Validation error" },
    401: { description: "Unauthorized" },
  },
});

registry.registerPath({
  method: "put",
  path: "/api/reservations/{id}",
  tags: ["Reservations"],
  summary: "Update date, time, party size, or special requests",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        "application/json": { schema: UpdateReservationBodySchema },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Updated reservation",
      content: { "application/json": { schema: ReservationResponseSchema } },
    },
    400: { description: "Validation error" },
    401: { description: "Unauthorized" },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/reservations/{id}",
  tags: ["Reservations"],
  summary: "Cancel a reservation — updates Firestore slot availability",
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: {
      description: "Cancelled reservation",
      content: { "application/json": { schema: ReservationResponseSchema } },
    },
    401: { description: "Unauthorized" },
    404: { description: "Reservation not found or not owned by user" },
  },
});
```

- [ ] Commit

```bash
git add src/modules/reservation/reservation.schema.ts
git commit -m "feat: add reservation Zod schemas and OpenAPI path registrations"
```

---

## Task 2: Reservation service

**File:** `src/modules/reservation/reservation.service.ts`

- [ ] Create the file

```typescript
import { prisma } from "../../../lib/db.js";
import { adminFirestore } from "../../config/firebase.js";
import { sendEmail } from "../../config/nodemailer.js";
import type { z } from "zod";
import type {
  CreateReservationBodySchema,
  UpdateReservationBodySchema,
} from "./reservation.schema.js";

export type CreateReservationInput = z.infer<typeof CreateReservationBodySchema>;
export type UpdateReservationInput = z.infer<typeof UpdateReservationBodySchema>;

export const getUserReservations = async (userId: string) => {
  return prisma.reservation.findMany({
    where: { userId },
    include: { restaurant: true },
    orderBy: { date: "desc" },
  });
};

export const createReservation = async (
  input: CreateReservationInput,
  userId: string,
  userEmail: string,
) => {
  const reservation = await prisma.reservation.create({
    data: {
      userId,
      restaurantId: input.restaurantId,
      date: new Date(input.date),
      time: input.time,
      partySize: input.partySize,
      specialRequests: input.specialRequests,
      status: "CONFIRMED",
    },
    include: { restaurant: true },
  });

  // Firestore sync (best-effort)
  adminFirestore
    .collection("reservations")
    .doc(reservation.id)
    .set({
      userId,
      restaurantId: input.restaurantId,
      date: input.date,
      time: input.time,
      partySize: input.partySize,
      status: "CONFIRMED",
      updatedAt: new Date().toISOString(),
    })
    .then(() => updateFirestoreSlot(input.restaurantId, input.date, input.time, +1))
    .catch((err) => console.error("Firestore sync failed (non-fatal):", err));

  // Confirmation email (best-effort)
  sendEmail(
    userEmail,
    "Reservation Confirmed!",
    `<h2>Your reservation is confirmed!</h2>
     <p><strong>Restaurant:</strong> ${reservation.restaurant.name}</p>
     <p><strong>Date:</strong> ${input.date}</p>
     <p><strong>Time:</strong> ${input.time}</p>
     <p><strong>Party size:</strong> ${input.partySize}</p>
     ${input.specialRequests ? `<p><strong>Special requests:</strong> ${input.specialRequests}</p>` : ""}`,
  ).catch((err) => console.error("Confirmation email failed (non-fatal):", err));

  return reservation;
};

export const cancelReservation = async (id: string, userId: string) => {
  const reservation = await prisma.reservation.update({
    where: { id, userId },
    data: { status: "CANCELLED" },
    include: { restaurant: true },
  });

  adminFirestore
    .collection("reservations")
    .doc(id)
    .update({ status: "CANCELLED", updatedAt: new Date().toISOString() })
    .then(() =>
      updateFirestoreSlot(
        reservation.restaurantId,
        reservation.date.toISOString().split("T")[0],
        reservation.time,
        -1,
      ),
    )
    .catch((err) => console.error("Firestore cancel sync failed (non-fatal):", err));

  return reservation;
};

export const updateReservation = async (
  id: string,
  userId: string,
  data: UpdateReservationInput,
) => {
  return prisma.reservation.update({
    where: { id, userId },
    data: {
      ...(data.date && { date: new Date(data.date) }),
      ...(data.time && { time: data.time }),
      ...(data.partySize && { partySize: data.partySize }),
      ...(data.specialRequests !== undefined && {
        specialRequests: data.specialRequests,
      }),
    },
  });
};

// ── internal helper ───────────────────────────────────────────────────────────

const updateFirestoreSlot = async (
  restaurantId: string,
  date: string,
  time: string,
  delta: number,
): Promise<void> => {
  const ref = adminFirestore
    .collection("restaurants")
    .doc(restaurantId)
    .collection("availability")
    .doc(date);

  const doc = await ref.get();
  if (!doc.exists) return;

  type Slot = { time: string; bookedTables: number; totalTables: number; available: boolean };
  const slots: Slot[] = doc.data()?.slots ?? [];

  const updated = slots.map((slot) => {
    if (slot.time !== time) return slot;
    const booked = Math.max(0, slot.bookedTables + delta);
    return { ...slot, bookedTables: booked, available: booked < slot.totalTables };
  });

  await ref.update({ slots: updated });
};
```

- [ ] Commit

```bash
git add src/modules/reservation/reservation.service.ts
git commit -m "feat: add reservation service with Firestore sync and email"
```

---

## Task 3: Reservation controller

**File:** `src/modules/reservation/reservation.controller.ts`

- [ ] Create the file

```typescript
import type { Response } from "express";
import type { AuthRequest } from "../../types/index.js";
import * as reservationService from "./reservation.service.js";

export const getUserReservations = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const reservations = await reservationService.getUserReservations(
    req.user!.dbId,
  );
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
    req.params.id,
    req.user!.dbId,
  );
  res.json(reservation);
};

export const updateReservation = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const reservation = await reservationService.updateReservation(
    req.params.id,
    req.user!.dbId,
    req.body as reservationService.UpdateReservationInput,
  );
  res.json(reservation);
};
```

- [ ] Commit

```bash
git add src/modules/reservation/reservation.controller.ts
git commit -m "feat: add reservation controller"
```

---

## Task 4: Reservation routes

**File:** `src/modules/reservation/reservation.routes.ts`

- [ ] Create the file

```typescript
import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import {
  CreateReservationBodySchema,
  UpdateReservationBodySchema,
} from "./reservation.schema.js";
import * as reservationController from "./reservation.controller.js";

const router = Router();

router.use(authenticate);

router.get("/", reservationController.getUserReservations);
router.post("/", validate(CreateReservationBodySchema), reservationController.createReservation);
router.put("/:id", validate(UpdateReservationBodySchema), reservationController.updateReservation);
router.delete("/:id", reservationController.cancelReservation);

export default router;
```

- [ ] Commit

```bash
git add src/modules/reservation/reservation.routes.ts
git commit -m "feat: add reservation routes with Zod validation"
```

---

## Task 5: Register schema import in swagger.ts + mount router in app.ts

- [ ] Add to side-effect imports in `src/docs/swagger.ts`

```typescript
import "../modules/reservation/reservation.schema.js";
```

- [ ] Add reservation routes to `src/app.ts`

```typescript
import reservationRoutes from "./modules/reservation/reservation.routes.js";
// ...
app.use("/api/reservations", reservationRoutes);
```

- [ ] Test Zod validation on create

```bash
curl -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -d '{"restaurantId":"not-a-uuid","date":"2026-13-01","partySize":0}'
# expected: 400 with fieldErrors for restaurantId, date, time, partySize
```

- [ ] Confirm reservation routes in Swagger UI

```bash
open http://localhost:3000/api/docs
# expected: 4 reservation routes with full schema docs
```

- [ ] Commit

```bash
git add src/docs/swagger.ts src/app.ts
git commit -m "feat: register reservation schema in Swagger and mount reservation routes"
```
