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
    status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"]),
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
      content: { "application/json": { schema: CreateReservationBodySchema } },
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
      content: { "application/json": { schema: UpdateReservationBodySchema } },
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
