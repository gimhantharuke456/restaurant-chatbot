# Phase 06 — Restaurant Module

> **For agentic workers:** Use `superpowers:executing-plans` or `superpowers:subagent-driven-development` to implement task-by-task.

**Goal:** Build the restaurant module — list/search, get by ID, create/update (admin only), real-time availability from Firestore, and menu — all with Zod validation and Swagger docs.

**Architecture:** `cuisineTypes` and `imageUrls` are stored as JSON strings in the DB — the service parses them before returning. Schema file registers query params and body schemas with the registry. Firestore availability is read-only from this module.

**Tech Stack:** Prisma, Firebase Admin (Firestore), Zod, @asteasolutions/zod-to-openapi

**Prerequisites:** Phase 01 (validate, registry), Phase 02 (firebase), Phase 03 (auth middleware)

---

## Files

| Action | Path |
|--------|------|
| Create | `src/modules/restaurant/restaurant.schema.ts` |
| Create | `src/modules/restaurant/restaurant.service.ts` |
| Create | `src/modules/restaurant/restaurant.controller.ts` |
| Create | `src/modules/restaurant/restaurant.routes.ts` |
| Modify | `src/docs/swagger.ts` |
| Modify | `src/app.ts` |

---

## Task 1: Restaurant schemas + OpenAPI registration

**File:** `src/modules/restaurant/restaurant.schema.ts`

- [ ] Create the file

```typescript
import { z } from "zod";
import { registry } from "../../docs/registry.js";

// ── Zod schemas ───────────────────────────────────────────────────────────────

export const RestaurantQuerySchema = z
  .object({
    area: z.string().optional(),
    cuisine: z.string().optional(),
    priceRange: z
      .enum(["BUDGET", "MODERATE", "EXPENSIVE", "FINE_DINING"])
      .optional(),
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
    openingHours: z.record(z.string()),
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
```

- [ ] Commit

```bash
git add src/modules/restaurant/restaurant.schema.ts
git commit -m "feat: add restaurant Zod schemas and OpenAPI path registrations"
```

---

## Task 2: Restaurant service

**File:** `src/modules/restaurant/restaurant.service.ts`

- [ ] Create the file

```typescript
import { prisma } from "../../../lib/db.js";
import { adminFirestore } from "../../config/firebase.js";
import type { PriceRange, Restaurant } from "../../../generated/prisma/client.js";
import type { z } from "zod";
import type {
  RestaurantQuerySchema,
  CreateRestaurantBodySchema,
  UpdateRestaurantBodySchema,
} from "./restaurant.schema.js";

export type RestaurantFilters = z.infer<typeof RestaurantQuerySchema>;
export type CreateRestaurantInput = z.infer<typeof CreateRestaurantBodySchema>;
export type UpdateRestaurantInput = z.infer<typeof UpdateRestaurantBodySchema>;

export const listRestaurants = async (filters: RestaurantFilters = {}) => {
  const where: Record<string, unknown> = { isActive: true };
  if (filters.area)
    where["area"] = { contains: filters.area, mode: "insensitive" };
  if (filters.priceRange) where["priceRange"] = filters.priceRange;

  const restaurants = await prisma.restaurant.findMany({
    where,
    orderBy: { avgRating: "desc" },
  });

  return restaurants.map(parseRestaurant);
};

export const getRestaurantById = async (id: string) => {
  const r = await prisma.restaurant.findUnique({ where: { id } });
  return r ? parseRestaurant(r) : null;
};

export const createRestaurant = async (
  input: CreateRestaurantInput,
  adminId: string,
) => {
  const r = await prisma.restaurant.create({
    data: {
      ...input,
      adminId,
      cuisineTypes: JSON.stringify(input.cuisineTypes),
      imageUrls: JSON.stringify(input.imageUrls),
      openingHours: input.openingHours,
    },
  });
  return parseRestaurant(r);
};

export const updateRestaurant = async (
  id: string,
  input: UpdateRestaurantInput,
) => {
  const data: Record<string, unknown> = { ...input };
  if (input.cuisineTypes) data["cuisineTypes"] = JSON.stringify(input.cuisineTypes);
  if (input.imageUrls) data["imageUrls"] = JSON.stringify(input.imageUrls);

  const r = await prisma.restaurant.update({ where: { id }, data });
  return parseRestaurant(r);
};

export const getAvailability = async (
  restaurantId: string,
  date: string,
): Promise<unknown[]> => {
  const doc = await adminFirestore
    .collection("restaurants")
    .doc(restaurantId)
    .collection("availability")
    .doc(date)
    .get();
  return doc.exists ? (doc.data()?.slots ?? []) : [];
};

export const getMenu = async (restaurantId: string) => {
  return prisma.menuItem.findMany({
    where: { restaurantId, isAvailable: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
};

// ── helper ────────────────────────────────────────────────────────────────────

const parseRestaurant = (r: Restaurant) => ({
  ...r,
  cuisineTypes: JSON.parse(r.cuisineTypes) as string[],
  imageUrls: JSON.parse(r.imageUrls) as string[],
});
```

- [ ] Commit

```bash
git add src/modules/restaurant/restaurant.service.ts
git commit -m "feat: add restaurant service"
```

---

## Task 3: Restaurant controller

**File:** `src/modules/restaurant/restaurant.controller.ts`

- [ ] Create the file

```typescript
import type { Request, Response } from "express";
import type { AuthRequest } from "../../types/index.js";
import * as restaurantService from "./restaurant.service.js";

export const getRestaurants = async (
  req: Request,
  res: Response,
): Promise<void> => {
  // req.query validated by validate(RestaurantQuerySchema, "query") in routes
  const restaurants = await restaurantService.listRestaurants(
    req.query as restaurantService.RestaurantFilters,
  );
  res.json(restaurants);
};

export const getRestaurantById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const r = await restaurantService.getRestaurantById(req.params.id);
  if (!r) {
    res.status(404).json({ error: "Restaurant not found" });
    return;
  }
  res.json(r);
};

export const createRestaurant = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const r = await restaurantService.createRestaurant(
    req.body as restaurantService.CreateRestaurantInput,
    req.user!.dbId,
  );
  res.status(201).json(r);
};

export const updateRestaurant = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const r = await restaurantService.updateRestaurant(
    req.params.id,
    req.body as restaurantService.UpdateRestaurantInput,
  );
  res.json(r);
};

export const getAvailability = async (
  req: Request,
  res: Response,
): Promise<void> => {
  // req.query validated by validate(AvailabilityQuerySchema, "query") in routes
  const { date } = req.query as { date: string };
  const slots = await restaurantService.getAvailability(req.params.id, date);
  res.json(slots);
};

export const getMenu = async (req: Request, res: Response): Promise<void> => {
  const items = await restaurantService.getMenu(req.params.id);
  res.json(items);
};
```

- [ ] Commit

```bash
git add src/modules/restaurant/restaurant.controller.ts
git commit -m "feat: add restaurant controller"
```

---

## Task 4: Restaurant routes

**File:** `src/modules/restaurant/restaurant.routes.ts`

- [ ] Create the file

```typescript
import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import {
  RestaurantQuerySchema,
  CreateRestaurantBodySchema,
  UpdateRestaurantBodySchema,
  AvailabilityQuerySchema,
} from "./restaurant.schema.js";
import * as restaurantController from "./restaurant.controller.js";

const router = Router();

router.get(
  "/",
  validate(RestaurantQuerySchema, "query"),
  restaurantController.getRestaurants,
);

router.get("/:id", restaurantController.getRestaurantById);

router.post(
  "/",
  authenticate,
  requireRole("RESTAURANT_ADMIN", "SYSTEM_ADMIN"),
  validate(CreateRestaurantBodySchema),
  restaurantController.createRestaurant,
);

router.put(
  "/:id",
  authenticate,
  requireRole("RESTAURANT_ADMIN", "SYSTEM_ADMIN"),
  validate(UpdateRestaurantBodySchema),
  restaurantController.updateRestaurant,
);

router.get(
  "/:id/availability",
  validate(AvailabilityQuerySchema, "query"),
  restaurantController.getAvailability,
);

router.get("/:id/menu", restaurantController.getMenu);

export default router;
```

- [ ] Commit

```bash
git add src/modules/restaurant/restaurant.routes.ts
git commit -m "feat: add restaurant routes with Zod validation"
```

---

## Task 5: Register schema import in swagger.ts + mount router in app.ts

- [ ] Add to side-effect imports in `src/docs/swagger.ts`

```typescript
import "../modules/restaurant/restaurant.schema.js";
```

- [ ] Add restaurant routes to `src/app.ts`

```typescript
import restaurantRoutes from "./modules/restaurant/restaurant.routes.js";
// ...
app.use("/api/restaurants", restaurantRoutes);
```

- [ ] Test listing with invalid price range

```bash
curl "http://localhost:3000/api/restaurants?priceRange=INVALID"
# expected: 400 {"error":"Validation failed",...}
```

- [ ] Test valid availability query

```bash
curl "http://localhost:3000/api/restaurants/some-id/availability?date=not-a-date"
# expected: 400 {"error":"Validation failed","issues":{"date":["Date must be YYYY-MM-DD"]}}
```

- [ ] Confirm restaurant routes in Swagger UI

```bash
open http://localhost:3000/api/docs
# expected: all 6 restaurant routes visible with query/body schemas
```

- [ ] Commit

```bash
git add src/docs/swagger.ts src/app.ts
git commit -m "feat: register restaurant schema in Swagger and mount restaurant routes"
```
