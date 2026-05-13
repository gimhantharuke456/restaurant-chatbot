# Phase 04 — Auth Module

> **For agentic workers:** Use `superpowers:executing-plans` or `superpowers:subagent-driven-development` to implement task-by-task.

**Goal:** Build the auth module with Zod validation on every input and full OpenAPI documentation registered for Swagger UI.

**Architecture:** `auth.schema.ts` defines Zod schemas and registers all auth paths with the OpenAPI registry. Controller reads the already-validated `req.body`. Routes apply the `validate` middleware before every controller that accepts a body.

**Tech Stack:** Prisma, Firebase Admin, Nodemailer, Zod, @asteasolutions/zod-to-openapi

**Prerequisites:** Phase 01 (validate middleware, registry), Phase 02 (firebase, nodemailer), Phase 03 (auth middleware)

---

## Files

| Action | Path |
|--------|------|
| Create | `src/modules/auth/auth.schema.ts` |
| Create | `src/modules/auth/auth.service.ts` |
| Create | `src/modules/auth/auth.controller.ts` |
| Create | `src/modules/auth/auth.routes.ts` |
| Modify | `src/docs/swagger.ts` |
| Modify | `src/app.ts` |

---

## Task 1: Auth schemas + OpenAPI registration

**File:** `src/modules/auth/auth.schema.ts`

- [ ] Create the file

```typescript
import { z } from "zod";
import { registry } from "../../docs/registry.js";

// ── Zod schemas (used by validate middleware) ─────────────────────────────────

export const RegisterBodySchema = z
  .object({
    firebaseUid: z.string().min(1),
    email: z.string().email(),
    name: z.string().min(1).optional(),
  })
  .openapi("RegisterBody");

export const UpdateProfileBodySchema = z
  .object({
    name: z.string().min(1).optional(),
    phone: z.string().optional(),
    avatarUrl: z.string().url().optional(),
  })
  .openapi("UpdateProfileBody");

// ── Reusable response schema ───────────────────────────────────────────────────

const UserResponseSchema = z
  .object({
    id: z.string().uuid(),
    firebaseUid: z.string(),
    email: z.string().email(),
    name: z.string().nullable(),
    phone: z.string().nullable(),
    avatarUrl: z.string().nullable(),
    role: z.enum(["CUSTOMER", "RESTAURANT_ADMIN", "SYSTEM_ADMIN"]),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("UserResponse");

registry.register("UserResponse", UserResponseSchema);

// ── OpenAPI path registrations ────────────────────────────────────────────────

registry.registerPath({
  method: "post",
  path: "/api/auth/register",
  tags: ["Auth"],
  summary: "Register or return existing user after Firebase sign-up",
  request: {
    body: {
      content: { "application/json": { schema: RegisterBodySchema } },
      required: true,
    },
  },
  responses: {
    201: {
      description: "User created or already exists",
      content: { "application/json": { schema: UserResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/auth/me",
  tags: ["Auth"],
  summary: "Get authenticated user's database record",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Authenticated user",
      content: { "application/json": { schema: UserResponseSchema } },
    },
    401: { description: "Missing or invalid token" },
  },
});

registry.registerPath({
  method: "put",
  path: "/api/auth/profile",
  tags: ["Auth"],
  summary: "Update name, phone, or avatar URL",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: UpdateProfileBodySchema },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Updated user",
      content: { "application/json": { schema: UserResponseSchema } },
    },
    400: { description: "Validation error" },
    401: { description: "Unauthorized" },
  },
});
```

- [ ] Commit

```bash
git add src/modules/auth/auth.schema.ts
git commit -m "feat: add auth Zod schemas and OpenAPI path registrations"
```

---

## Task 2: Auth service

**File:** `src/modules/auth/auth.service.ts`

- [ ] Create the file

```typescript
import { prisma } from "../../../lib/db.js";
import { sendEmail } from "../../config/nodemailer.js";
import type { User } from "../../../generated/prisma/client.js";
import type { z } from "zod";
import type { RegisterBodySchema, UpdateProfileBodySchema } from "./auth.schema.js";

export type RegisterInput = z.infer<typeof RegisterBodySchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileBodySchema>;

export const findOrCreateUser = async (input: RegisterInput): Promise<User> => {
  const existing = await prisma.user.findUnique({
    where: { firebaseUid: input.firebaseUid },
  });
  if (existing) return existing;

  const user = await prisma.user.create({
    data: {
      firebaseUid: input.firebaseUid,
      email: input.email,
      name: input.name,
    },
  });

  await sendEmail(
    user.email,
    "Welcome to Restaurant Chatbot!",
    `<h2>Welcome ${user.name ?? ""}!</h2>
     <p>Your account is ready. Start discovering restaurants in Colombo today.</p>`,
  ).catch((err) => console.error("Welcome email failed (non-fatal):", err));

  return user;
};

export const getUserById = async (id: string): Promise<User | null> => {
  return prisma.user.findUnique({ where: { id } });
};

export const updateUser = async (
  id: string,
  data: UpdateProfileInput,
): Promise<User> => {
  return prisma.user.update({ where: { id }, data });
};
```

- [ ] Commit

```bash
git add src/modules/auth/auth.service.ts
git commit -m "feat: add auth service"
```

---

## Task 3: Auth controller

**File:** `src/modules/auth/auth.controller.ts`

- [ ] Create the file

```typescript
import type { Request, Response } from "express";
import type { AuthRequest } from "../../types/index.js";
import * as authService from "./auth.service.js";

export const register = async (req: Request, res: Response): Promise<void> => {
  // req.body already validated by validate(RegisterBodySchema) in routes
  const user = await authService.findOrCreateUser(
    req.body as authService.RegisterInput,
  );
  res.status(201).json(user);
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await authService.getUserById(req.user!.dbId);
  res.json(user);
};

export const updateProfile = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const user = await authService.updateUser(
    req.user!.dbId,
    req.body as authService.UpdateProfileInput,
  );
  res.json(user);
};
```

- [ ] Commit

```bash
git add src/modules/auth/auth.controller.ts
git commit -m "feat: add auth controller"
```

---

## Task 4: Auth routes

**File:** `src/modules/auth/auth.routes.ts`

- [ ] Create the file

```typescript
import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { RegisterBodySchema, UpdateProfileBodySchema } from "./auth.schema.js";
import * as authController from "./auth.controller.js";

const router = Router();

router.post("/register", validate(RegisterBodySchema), authController.register);
router.get("/me", authenticate, authController.getMe);
router.put(
  "/profile",
  authenticate,
  validate(UpdateProfileBodySchema),
  authController.updateProfile,
);

export default router;
```

- [ ] Commit

```bash
git add src/modules/auth/auth.routes.ts
git commit -m "feat: add auth routes with Zod validation"
```

---

## Task 5: Register auth schema import in swagger.ts + mount router in app.ts

**File:** `src/docs/swagger.ts` — add auth schema side-effect import

- [ ] Update `src/docs/swagger.ts`

```typescript
import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import swaggerUi from "swagger-ui-express";
import type { Express } from "express";
import { registry } from "./registry.js";

// Side-effect imports — each registers its paths with the registry
import "../modules/auth/auth.schema.js";

export const buildSwaggerDocument = () => {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Restaurant Chatbot API",
      version: "1.0.0",
      description:
        "Agentic restaurant discovery and reservation system for the Colombo district.",
    },
    servers: [{ url: "http://localhost:3000", description: "Local development" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Firebase ID token",
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

**File:** `src/app.ts` — mount auth router

- [ ] Update `src/app.ts`

```typescript
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimiter } from "./middleware/rateLimiter.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { setupSwagger } from "./docs/swagger.js";
import authRoutes from "./modules/auth/auth.routes.js";

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

// more module routes added in later phases

app.use(errorHandler);

export default app;
```

- [ ] Restart and verify registration works

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firebaseUid":"test-uid-001","email":"test@example.com","name":"Test User"}'
# expected: 201 with user JSON
```

- [ ] Verify Zod rejects invalid input

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firebaseUid":"","email":"not-an-email"}'
# expected: 400 {"error":"Validation failed","issues":{...}}
```

- [ ] Open Swagger UI and confirm auth routes appear

```bash
open http://localhost:3000/api/docs
# expected: POST /api/auth/register, GET /api/auth/me, PUT /api/auth/profile all visible
```

- [ ] Commit

```bash
git add src/docs/swagger.ts src/app.ts
git commit -m "feat: register auth schema in Swagger and mount auth routes"
```
