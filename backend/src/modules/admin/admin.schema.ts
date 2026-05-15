import { z } from "zod";
import { registry } from "../../docs/registry.js";

export const VerifyRestaurantBodySchema = z
  .object({ isVerified: z.boolean() })
  .openapi("VerifyRestaurantBody");

export const ToggleActiveBodySchema = z
  .object({ isActive: z.boolean() })
  .openapi("ToggleActiveBody");

export const UpdateRoleBodySchema = z
  .object({
    role: z.enum(["CUSTOMER", "RESTAURANT_ADMIN", "SYSTEM_ADMIN"]),
  })
  .openapi("UpdateRoleBody");

// ── Response schemas ──────────────────────────────────────────────────────────

const DashboardStatsSchema = z
  .object({
    totalUsers: z.number(),
    totalRestaurants: z.number(),
    activeReservations: z.number(),
    totalPayments: z.number(),
    totalRevenue: z.number(),
    verificationPending: z.number(),
  })
  .openapi("DashboardStats");

registry.register("DashboardStats", DashboardStatsSchema);

// ── OpenAPI path registrations ────────────────────────────────────────────────

registry.registerPath({
  method: "get",
  path: "/api/admin/stats",
  tags: ["Admin"],
  summary: "Dashboard stats — totals for users, restaurants, reservations, revenue",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Dashboard stats",
      content: { "application/json": { schema: DashboardStatsSchema } },
    },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden — SYSTEM_ADMIN only" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/restaurants",
  tags: ["Admin"],
  summary: "List all restaurants including inactive ones",
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      includeInactive: z.string().optional().describe("Pass 'true' to include inactive"),
    }),
  },
  responses: {
    200: { description: "All restaurants" },
    403: { description: "Forbidden" },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/admin/restaurants/{id}/verify",
  tags: ["Admin"],
  summary: "Mark restaurant as verified",
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Updated restaurant" },
    403: { description: "Forbidden" },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/admin/restaurants/{id}/active",
  tags: ["Admin"],
  summary: "Set restaurant active/inactive",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: { "application/json": { schema: ToggleActiveBodySchema } },
      required: true,
    },
  },
  responses: {
    200: { description: "Updated restaurant" },
    403: { description: "Forbidden" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/users",
  tags: ["Admin"],
  summary: "List all users with reservation counts",
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: "All users" },
    403: { description: "Forbidden" },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/admin/users/{id}/role",
  tags: ["Admin"],
  summary: "Change a user's role",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: { "application/json": { schema: UpdateRoleBodySchema } },
      required: true,
    },
  },
  responses: {
    200: { description: "Updated user" },
    403: { description: "Forbidden" },
  },
});
