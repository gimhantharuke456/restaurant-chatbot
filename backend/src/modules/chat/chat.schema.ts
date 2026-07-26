import { z } from "zod";
import { registry } from "../../docs/registry.js";

// ── Zod schemas ───────────────────────────────────────────────────────────────

const ChatMessageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1),
  })
  .openapi("ChatMessage");

export const SendMessageBodySchema = z
  .object({
    message: z.string().min(1).max(2000),
    sessionId: z.string().uuid(),
    history: z.array(ChatMessageSchema).default([]),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
  })
  .openapi("SendMessageBody");

// ── Response schemas ──────────────────────────────────────────────────────────

const ChatResponseSchema = z
  .object({
    session_id: z.string().uuid(),
    message: z.string(),
    intent: z.string().optional(),
    data: z.unknown().optional(),
    guest_limit_reached: z.boolean().optional(),
  })
  .openapi("ChatResponse");

const ChatSessionSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().nullable(),
    messages: z.array(ChatMessageSchema),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi("ChatSession");

registry.register("ChatMessage", ChatMessageSchema);
registry.register("ChatResponse", ChatResponseSchema);
registry.register("ChatSession", ChatSessionSchema);

// ── OpenAPI path registrations ────────────────────────────────────────────────

registry.registerPath({
  method: "post",
  path: "/api/chat/message",
  tags: ["Chat"],
  summary: "Send a message to the AI service and persist the session",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { "application/json": { schema: SendMessageBodySchema } },
      required: true,
    },
  },
  responses: {
    200: {
      description: "AI response with intent classification",
      content: { "application/json": { schema: ChatResponseSchema } },
    },
    400: { description: "Validation error" },
    401: { description: "Unauthorized" },
    502: { description: "AI service unavailable" },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/chat/history",
  tags: ["Chat"],
  summary: "Get the last 20 chat sessions for the authenticated user",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Chat sessions",
      content: {
        "application/json": { schema: z.array(ChatSessionSchema) },
      },
    },
    401: { description: "Unauthorized" },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/chat/session/{id}",
  tags: ["Chat"],
  summary: "Delete a chat session",
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Session deleted" },
    401: { description: "Unauthorized" },
    404: { description: "Session not found or not owned by user" },
  },
});
