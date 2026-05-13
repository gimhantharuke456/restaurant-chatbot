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
