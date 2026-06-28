import { z } from "zod";
import { registry } from "../../docs/registry.js";

// ── Zod schemas ───────────────────────────────────────────────────────────────

export const RestaurantQuerySchema = z
  .object({
    area: z.string().optional(),
    priceRange: z.enum(["BUDGET", "MODERATE", "EXPENSIVE", "FINE_DINING"]).optional(),
    cuisine: z.string().optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .openapi("RestaurantQuery");

export const CreateRestaurantBodySchema = z
  .object({
    name: z.string().min(1),
    description: z.string().optional(),
    address: z.string().min(1),
    area: z.string().min(1),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    website: z.string().url().optional(),
    cuisineTypes: z.array(z.string()).default([]),
    priceRange: z.enum(["BUDGET", "MODERATE", "EXPENSIVE", "FINE_DINING"]),
    openingHours: z.record(z.string(), z.string()),
    imageUrls: z.array(z.string().url()).default([]),
  })
  .openapi("CreateRestaurantBody");

export const UpdateRestaurantBodySchema = CreateRestaurantBodySchema.partial().openapi(
  "UpdateRestaurantBody",
);

export const AvailabilityQuerySchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  })
  .openapi("AvailabilityQuery");

// ── Response schemas ──────────────────────────────────────────────────────────

const RestaurantResponseSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    address: z.string(),
    area: z.string(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    cuisineTypes: z.array(z.string()),
    priceRange: z.enum(["BUDGET", "MODERATE", "EXPENSIVE", "FINE_DINING"]),
    avgRating: z.number().nullable(),
    totalReviews: z.number(),
    isActive: z.boolean(),
    isVerified: z.boolean(),
  })
  .openapi("RestaurantResponse");

registry.register("RestaurantResponse", RestaurantResponseSchema);

// ── OpenAPI path registrations ────────────────────────────────────────────────

registry.registerPath({
  method: "get",
  path: "/api/restaurants",
  tags: ["Restaurants"],
  summary: "List restaurants with optional filters",
  request: { query: RestaurantQuerySchema },
  responses: {
    200: {
      description: "Array of restaurants",
      content: {
        "application/json": { schema: z.array(RestaurantResponseSchema) },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/restaurants/{id}",
  tags: ["Restaurants"],
  summary: "Get a single restaurant by ID",
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: {
      description: "Restaurant",
      content: { "application/json": { schema: RestaurantResponseSchema } },
    },
    404: { description: "Not found" },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/restaurants",
  tags: ["Restaurants"],
  summary: "Create a restaurant (RESTAURANT_ADMIN only)",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { "application/json": { schema: CreateRestaurantBodySchema } },
      required: true,
    },
  },
  responses: {
    201: {
      description: "Created restaurant",
      content: { "application/json": { schema: RestaurantResponseSchema } },
    },
    400: { description: "Validation error" },
    403: { description: "Forbidden" },
  },
});

registry.registerPath({
  method: "put",
  path: "/api/restaurants/{id}",
  tags: ["Restaurants"],
  summary: "Update a restaurant (RESTAURANT_ADMIN only)",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: { "application/json": { schema: UpdateRestaurantBodySchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Updated restaurant",
      content: { "application/json": { schema: RestaurantResponseSchema } },
    },
    403: { description: "Forbidden" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/restaurants/{id}/availability",
  tags: ["Restaurants"],
  summary: "Get time slot availability from Firestore for a given date",
  request: {
    params: z.object({ id: z.string().uuid() }),
    query: AvailabilityQuerySchema,
  },
  responses: {
    200: { description: "Array of time slots" },
    400: { description: "Missing or invalid date param" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/restaurants/{id}/menu",
  tags: ["Restaurants"],
  summary: "Get available menu items for a restaurant",
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Array of menu items" },
  },
});

export const ReviewQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(20).default(10),
  rating: z.coerce.number().int().min(1).max(5).optional(),
});
