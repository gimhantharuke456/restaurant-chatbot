# Phase 05 — User Module

> **For agentic workers:** Use `superpowers:executing-plans` or `superpowers:subagent-driven-development` to implement task-by-task.

**Goal:** Build the user module with Zod-validated inputs and OpenAPI docs for profile read/write and a combined profile+reservations endpoint.

**Architecture:** Thin module. Service wraps Prisma. Controller enforces users only access their own data. Schema file registers paths with the shared registry.

**Tech Stack:** Prisma, Zod, @asteasolutions/zod-to-openapi

**Prerequisites:** Phase 01 (validate, registry), Phase 03 (auth middleware), Phase 04 (User record must exist)

---

## Files

| Action | Path |
|--------|------|
| Create | `src/modules/user/user.schema.ts` |
| Create | `src/modules/user/user.service.ts` |
| Create | `src/modules/user/user.controller.ts` |
| Create | `src/modules/user/user.routes.ts` |
| Modify | `src/docs/swagger.ts` |
| Modify | `src/app.ts` |

---

## Task 1: User schemas + OpenAPI registration

**File:** `src/modules/user/user.schema.ts`

- [ ] Create the file

```typescript
import { z } from "zod";
import { registry } from "../../docs/registry.js";

export const UpdateProfileBodySchema = z
  .object({
    name: z.string().min(1).optional(),
    phone: z.string().optional(),
    avatarUrl: z.string().url().optional(),
  })
  .openapi("UpdateUserBody");

const UserResponseSchema = z
  .object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string().nullable(),
    phone: z.string().nullable(),
    avatarUrl: z.string().nullable(),
    role: z.enum(["CUSTOMER", "RESTAURANT_ADMIN", "SYSTEM_ADMIN"]),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("UserProfileResponse");

registry.registerPath({
  method: "get",
  path: "/api/users/me",
  tags: ["Users"],
  summary: "Get current user's profile",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "User profile",
      content: { "application/json": { schema: UserResponseSchema } },
    },
    401: { description: "Unauthorized" },
    404: { description: "User not found" },
  },
});

registry.registerPath({
  method: "put",
  path: "/api/users/me",
  tags: ["Users"],
  summary: "Update current user's profile",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { "application/json": { schema: UpdateProfileBodySchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Updated profile",
      content: { "application/json": { schema: UserResponseSchema } },
    },
    400: { description: "Validation error" },
    401: { description: "Unauthorized" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/users/me/full",
  tags: ["Users"],
  summary: "Get profile with last 10 reservations",
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: "Profile with reservations" },
    401: { description: "Unauthorized" },
  },
});
```

- [ ] Commit

```bash
git add src/modules/user/user.schema.ts
git commit -m "feat: add user Zod schemas and OpenAPI path registrations"
```

---

## Task 2: User service

**File:** `src/modules/user/user.service.ts`

- [ ] Create the file

```typescript
import { prisma } from "../../../lib/db.js";
import type { User } from "../../../generated/prisma/client.js";
import type { z } from "zod";
import type { UpdateProfileBodySchema } from "./user.schema.js";

export type UpdateProfileInput = z.infer<typeof UpdateProfileBodySchema>;

export const getUser = async (id: string): Promise<User | null> => {
  return prisma.user.findUnique({ where: { id } });
};

export const updateUser = async (
  id: string,
  data: UpdateProfileInput,
): Promise<User> => {
  return prisma.user.update({ where: { id }, data });
};

export const getUserWithReservations = async (id: string) => {
  return prisma.user.findUnique({
    where: { id },
    include: {
      reservations: {
        include: { restaurant: true },
        orderBy: { date: "desc" },
        take: 10,
      },
    },
  });
};
```

- [ ] Commit

```bash
git add src/modules/user/user.service.ts
git commit -m "feat: add user service"
```

---

## Task 3: User controller

**File:** `src/modules/user/user.controller.ts`

- [ ] Create the file

```typescript
import type { Response } from "express";
import type { AuthRequest } from "../../types/index.js";
import * as userService from "./user.service.js";

export const getProfile = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const user = await userService.getUser(req.user!.dbId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(user);
};

export const updateProfile = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const user = await userService.updateUser(
    req.user!.dbId,
    req.body as userService.UpdateProfileInput,
  );
  res.json(user);
};

export const getProfileWithReservations = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const user = await userService.getUserWithReservations(req.user!.dbId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(user);
};
```

- [ ] Commit

```bash
git add src/modules/user/user.controller.ts
git commit -m "feat: add user controller"
```

---

## Task 4: User routes

**File:** `src/modules/user/user.routes.ts`

- [ ] Create the file

```typescript
import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { UpdateProfileBodySchema } from "./user.schema.js";
import * as userController from "./user.controller.js";

const router = Router();

router.get("/me", authenticate, userController.getProfile);
router.put(
  "/me",
  authenticate,
  validate(UpdateProfileBodySchema),
  userController.updateProfile,
);
router.get("/me/full", authenticate, userController.getProfileWithReservations);

export default router;
```

- [ ] Commit

```bash
git add src/modules/user/user.routes.ts
git commit -m "feat: add user routes with Zod validation"
```

---

## Task 5: Register schema import in swagger.ts + mount router in app.ts

**File:** `src/docs/swagger.ts` — add user schema import

- [ ] Add `import "../modules/user/user.schema.js";` to the side-effect imports block in `src/docs/swagger.ts`

```typescript
// Side-effect imports
import "../modules/auth/auth.schema.js";
import "../modules/user/user.schema.js";
```

**File:** `src/app.ts` — mount user router

- [ ] Add user routes import and mount in `src/app.ts`

```typescript
import userRoutes from "./modules/user/user.routes.js";
// ...
app.use("/api/users", userRoutes);
```

- [ ] Verify 401 on unauthenticated request

```bash
curl http://localhost:3000/api/users/me
# expected: 401 {"error":"No token provided"}
```

- [ ] Verify user routes appear in Swagger UI

```bash
open http://localhost:3000/api/docs
# expected: GET /api/users/me, PUT /api/users/me, GET /api/users/me/full
```

- [ ] Commit

```bash
git add src/docs/swagger.ts src/app.ts
git commit -m "feat: register user schema in Swagger and mount user routes"
```
