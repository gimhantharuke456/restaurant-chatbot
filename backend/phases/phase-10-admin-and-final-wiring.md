# Phase 10 — Admin Module & Final Wiring

> **For agentic workers:** Use `superpowers:executing-plans` or `superpowers:subagent-driven-development` to implement task-by-task.

**Goal:** Build the admin module, complete the final `app.ts` with all modules mounted, finalize `swagger.ts` with all schema imports, and run a smoke test of every endpoint group.

**Architecture:** Admin routes are guarded by `authenticate` + `requireRole("SYSTEM_ADMIN")`. The final `swagger.ts` imports all 7 schema files as side effects — this is the only place they need to be listed.

**Tech Stack:** Prisma, Zod, @asteasolutions/zod-to-openapi

**Prerequisites:** Phases 01–09 all complete

---

## Files

| Action | Path |
|--------|------|
| Create | `src/modules/admin/admin.schema.ts` |
| Create | `src/modules/admin/admin.service.ts` |
| Create | `src/modules/admin/admin.controller.ts` |
| Create | `src/modules/admin/admin.routes.ts` |
| Replace | `src/docs/swagger.ts` — final version with all schema imports |
| Replace | `src/app.ts` — final version with all modules mounted |

---

## Task 1: Admin schemas + OpenAPI registration

**File:** `src/modules/admin/admin.schema.ts`

- [ ] Create the file

```typescript
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
    activeRestaurants: z.number(),
    totalReservations: z.number(),
    totalRevenueLKR: z.number(),
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
  method: "patch",
  path: "/api/admin/restaurants/{id}/verify",
  tags: ["Admin"],
  summary: "Set restaurant verified status",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: { "application/json": { schema: VerifyRestaurantBodySchema } },
      required: true,
    },
  },
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
```

- [ ] Commit

```bash
git add src/modules/admin/admin.schema.ts
git commit -m "feat: add admin Zod schemas and OpenAPI path registrations"
```

---

## Task 2: Admin service

**File:** `src/modules/admin/admin.service.ts`

- [ ] Create the file

```typescript
import { prisma } from "../../../lib/db.js";
import type { z } from "zod";
import type { UpdateRoleBodySchema } from "./admin.schema.js";

export type UpdateRoleInput = z.infer<typeof UpdateRoleBodySchema>;

export const getDashboardStats = async () => {
  const [users, restaurants, reservations, payments] = await Promise.all([
    prisma.user.count(),
    prisma.restaurant.count({ where: { isActive: true } }),
    prisma.reservation.count(),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: "SUCCEEDED" },
    }),
  ]);
  return {
    totalUsers: users,
    activeRestaurants: restaurants,
    totalReservations: reservations,
    totalRevenueLKR: payments._sum.amount ?? 0,
  };
};

export const getAllRestaurants = async (includeInactive = false) => {
  return prisma.restaurant.findMany({
    where: includeInactive ? {} : { isActive: true },
    include: { admin: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
};

export const verifyRestaurant = async (id: string, isVerified: boolean) => {
  return prisma.restaurant.update({ where: { id }, data: { isVerified } });
};

export const toggleRestaurantActive = async (id: string, isActive: boolean) => {
  return prisma.restaurant.update({ where: { id }, data: { isActive } });
};

export const getAllUsers = async () => {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      _count: { select: { reservations: true } },
    },
  });
};

export const updateUserRole = async (id: string, data: UpdateRoleInput) => {
  return prisma.user.update({ where: { id }, data: { role: data.role } });
};
```

- [ ] Commit

```bash
git add src/modules/admin/admin.service.ts
git commit -m "feat: add admin service"
```

---

## Task 3: Admin controller

**File:** `src/modules/admin/admin.controller.ts`

- [ ] Create the file

```typescript
import type { Request, Response } from "express";
import * as adminService from "./admin.service.js";

export const getDashboardStats = async (_req: Request, res: Response): Promise<void> => {
  res.json(await adminService.getDashboardStats());
};

export const getAllRestaurants = async (req: Request, res: Response): Promise<void> => {
  res.json(await adminService.getAllRestaurants(req.query.includeInactive === "true"));
};

export const verifyRestaurant = async (req: Request, res: Response): Promise<void> => {
  res.json(await adminService.verifyRestaurant(req.params.id, req.body.isVerified as boolean));
};

export const toggleRestaurantActive = async (req: Request, res: Response): Promise<void> => {
  res.json(await adminService.toggleRestaurantActive(req.params.id, req.body.isActive as boolean));
};

export const getAllUsers = async (_req: Request, res: Response): Promise<void> => {
  res.json(await adminService.getAllUsers());
};

export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  res.json(await adminService.updateUserRole(req.params.id, req.body as adminService.UpdateRoleInput));
};
```

- [ ] Commit

```bash
git add src/modules/admin/admin.controller.ts
git commit -m "feat: add admin controller"
```

---

## Task 4: Admin routes

**File:** `src/modules/admin/admin.routes.ts`

- [ ] Create the file

```typescript
import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import {
  VerifyRestaurantBodySchema,
  ToggleActiveBodySchema,
  UpdateRoleBodySchema,
} from "./admin.schema.js";
import * as adminController from "./admin.controller.js";

const router = Router();

router.use(authenticate, requireRole("SYSTEM_ADMIN"));

router.get("/stats", adminController.getDashboardStats);
router.get("/restaurants", adminController.getAllRestaurants);
router.patch("/restaurants/:id/verify", validate(VerifyRestaurantBodySchema), adminController.verifyRestaurant);
router.patch("/restaurants/:id/active", validate(ToggleActiveBodySchema), adminController.toggleRestaurantActive);
router.get("/users", adminController.getAllUsers);
router.patch("/users/:id/role", validate(UpdateRoleBodySchema), adminController.updateUserRole);

export default router;
```

- [ ] Commit

```bash
git add src/modules/admin/admin.routes.ts
git commit -m "feat: add admin routes with Zod validation"
```

---

## Task 5: Final swagger.ts — all schema imports

**File:** `src/docs/swagger.ts` — replace with complete final version

- [ ] Write the final `src/docs/swagger.ts`

```typescript
import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import swaggerUi from "swagger-ui-express";
import type { Express } from "express";
import { registry } from "./registry.js";

// Side-effect imports — each registers its paths with the registry
import "../modules/auth/auth.schema.js";
import "../modules/user/user.schema.js";
import "../modules/restaurant/restaurant.schema.js";
import "../modules/reservation/reservation.schema.js";
import "../modules/payment/payment.schema.js";
import "../modules/chat/chat.schema.js";
import "../modules/admin/admin.schema.js";

export const buildSwaggerDocument = () => {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Restaurant Chatbot API",
      version: "1.0.0",
      description:
        "Agentic restaurant discovery and reservation system for the Colombo district, Sri Lanka.",
    },
    servers: [{ url: "http://localhost:3000", description: "Local development" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Firebase ID token — obtain from Firebase Auth client SDK",
        },
      },
    },
  });
};

export const setupSwagger = (app: Express): void => {
  const document = buildSwaggerDocument();
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(document));
  app.get("/api/docs.json", (_req, res) => res.json(document));
};
```

- [ ] Commit

```bash
git add src/docs/swagger.ts
git commit -m "feat: finalize swagger.ts with all 7 module schema imports"
```

---

## Task 6: Final app.ts — all modules mounted

**File:** `src/app.ts` — replace with complete final version

- [ ] Write the final `src/app.ts`

```typescript
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimiter } from "./middleware/rateLimiter.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { setupSwagger } from "./docs/swagger.js";
import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/user/user.routes.js";
import restaurantRoutes from "./modules/restaurant/restaurant.routes.js";
import reservationRoutes from "./modules/reservation/reservation.routes.js";
import paymentRoutes from "./modules/payment/payment.routes.js";
import chatRoutes from "./modules/chat/chat.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";

const app = express();

app.use(helmet());
app.use(cors({
  origin: `http://localhost:${process.env.FRONTEND_PORT || 3001}`,
  credentials: true,
}));
app.use(express.json());
app.use(rateLimiter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

setupSwagger(app);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/admin", adminRoutes);

app.use(errorHandler);

export default app;
```

- [ ] Commit

```bash
git add src/app.ts
git commit -m "feat: final app.ts — all 7 modules mounted"
```

---

## Task 7: Smoke test all endpoints + Swagger

- [ ] Health check

```bash
curl http://localhost:3000/health
# expected: {"status":"ok","timestamp":"..."}
```

- [ ] Public restaurant list (no auth needed)

```bash
curl http://localhost:3000/api/restaurants
# expected: 200 JSON array
```

- [ ] Unauthenticated 401s across all protected route groups

```bash
for path in /api/users/me /api/reservations /api/payments/history /api/chat/history /api/admin/stats; do
  status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000$path)
  echo "$path → $status"
done
# expected: all 401
```

- [ ] Zod validation catches bad input

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"not-an-email"}'
# expected: 400 {"error":"Validation failed","issues":{"firebaseUid":[...],"email":[...]}}
```

- [ ] Swagger UI shows all 28 routes across 7 tags

```bash
open http://localhost:3000/api/docs
# expected: Auth, Users, Restaurants, Reservations, Payments, Chat, Admin tags
# each tag expanded shows correct request/response schemas
```

- [ ] Swagger JSON is valid OpenAPI 3.0

```bash
curl -s http://localhost:3000/api/docs.json | python3 -m json.tool > /dev/null && echo "valid JSON"
# expected: valid JSON (no parse error)
```

- [ ] Commit final confirmation

```bash
git commit --allow-empty -m "chore: backend complete — 7 modules, Zod validation, Swagger UI at /api/docs"
```

---

## Final file map

```
backend/src/
├── index.ts
├── app.ts
├── types/
│   └── index.ts
├── docs/
│   ├── registry.ts
│   └── swagger.ts
├── config/
│   ├── firebase.ts
│   ├── nodemailer.ts
│   └── stripe.ts
├── middleware/
│   ├── auth.ts
│   ├── errorHandler.ts
│   ├── rateLimiter.ts
│   └── validate.ts
└── modules/
    ├── auth/         auth.schema.ts · auth.service.ts · auth.controller.ts · auth.routes.ts
    ├── user/         user.schema.ts · user.service.ts · user.controller.ts · user.routes.ts
    ├── restaurant/   restaurant.schema.ts · restaurant.service.ts · …
    ├── reservation/  reservation.schema.ts · reservation.service.ts · …
    ├── payment/      payment.schema.ts · payment.service.ts · …
    ├── chat/         chat.schema.ts · chat.service.ts · …
    └── admin/        admin.schema.ts · admin.service.ts · …
```

**Total: 34 files — 7 modules × 4 files + 6 shared files**
