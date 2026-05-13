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
