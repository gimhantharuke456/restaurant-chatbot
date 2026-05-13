# Phase 09 — Chat Module

> **For agentic workers:** Use `superpowers:executing-plans` or `superpowers:subagent-driven-development` to implement task-by-task.

**Goal:** Build the chat module — Zod-validated message forwarding to the Python AI service, session persistence in Postgres, history retrieval, and session deletion — with Swagger docs.

**Architecture:** Service forwards messages + history to `AI_SERVICE_URL/chat`. If the AI service is down, a 502 is thrown and caught by the global error handler. Session is upserted after each successful exchange.

**Tech Stack:** Prisma, axios, Zod, @asteasolutions/zod-to-openapi

**Prerequisites:** Phase 01 (validate, registry), Phase 03 (auth middleware)

---

## Files

| Action | Path |
|--------|------|
| Create | `src/modules/chat/chat.schema.ts` |
| Create | `src/modules/chat/chat.service.ts` |
| Create | `src/modules/chat/chat.controller.ts` |
| Create | `src/modules/chat/chat.routes.ts` |
| Modify | `src/docs/swagger.ts` |
| Modify | `src/app.ts` |

---

## Task 1: Chat schemas + OpenAPI registration

**File:** `src/modules/chat/chat.schema.ts`

- [ ] Create the file

```typescript
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
  })
  .openapi("SendMessageBody");

// ── Response schemas ──────────────────────────────────────────────────────────

const ChatResponseSchema = z
  .object({
    session_id: z.string().uuid(),
    message: z.string(),
    intent: z.string().optional(),
    data: z.unknown().optional(),
  })
  .openapi("ChatResponse");

const ChatSessionSchema = z
  .object({
    id: z.string().uuid(),
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
```

- [ ] Commit

```bash
git add src/modules/chat/chat.schema.ts
git commit -m "feat: add chat Zod schemas and OpenAPI path registrations"
```

---

## Task 2: Chat service

**File:** `src/modules/chat/chat.service.ts`

- [ ] Create the file

```typescript
import axios from "axios";
import { prisma } from "../../../lib/db.js";
import type { z } from "zod";
import type { SendMessageBodySchema } from "./chat.schema.js";

export type SendMessageInput = z.infer<typeof SendMessageBodySchema>;

export interface AiServiceResponse {
  session_id: string;
  message: string;
  intent?: string;
  data?: unknown;
}

export const sendMessage = async (
  input: SendMessageInput,
  userId: string,
): Promise<AiServiceResponse> => {
  const aiServiceUrl = process.env.AI_SERVICE_URL ?? "http://localhost:8000";

  let aiResponse: AiServiceResponse;
  try {
    const { data } = await axios.post<AiServiceResponse>(
      `${aiServiceUrl}/chat`,
      {
        user_id: userId,
        session_id: input.sessionId,
        message: input.message,
        history: input.history,
      },
    );
    aiResponse = data;
  } catch {
    const err = new Error("AI service unavailable") as Error & { status: number };
    err.status = 502;
    throw err;
  }

  const updatedMessages = [
    ...input.history,
    { role: "user" as const, content: input.message },
    { role: "assistant" as const, content: aiResponse.message },
  ];

  await prisma.chatSession.upsert({
    where: { id: input.sessionId },
    create: { id: input.sessionId, userId, messages: updatedMessages },
    update: { messages: updatedMessages },
  });

  return aiResponse;
};

export const getHistory = async (userId: string) => {
  return prisma.chatSession.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: {
      id: true,
      messages: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

export const clearSession = async (
  sessionId: string,
  userId: string,
): Promise<void> => {
  await prisma.chatSession.delete({
    where: { id: sessionId, userId },
  });
};
```

- [ ] Commit

```bash
git add src/modules/chat/chat.service.ts
git commit -m "feat: add chat service (AI proxy + session persistence)"
```

---

## Task 3: Chat controller

**File:** `src/modules/chat/chat.controller.ts`

- [ ] Create the file

```typescript
import type { Response } from "express";
import type { AuthRequest } from "../../types/index.js";
import * as chatService from "./chat.service.js";

export const sendMessage = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const result = await chatService.sendMessage(
    req.body as chatService.SendMessageInput,
    req.user!.dbId,
  );
  res.json(result);
};

export const getHistory = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const sessions = await chatService.getHistory(req.user!.dbId);
  res.json(sessions);
};

export const clearSession = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  await chatService.clearSession(req.params.id, req.user!.dbId);
  res.json({ success: true });
};
```

- [ ] Commit

```bash
git add src/modules/chat/chat.controller.ts
git commit -m "feat: add chat controller"
```

---

## Task 4: Chat routes

**File:** `src/modules/chat/chat.routes.ts`

- [ ] Create the file

```typescript
import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { SendMessageBodySchema } from "./chat.schema.js";
import * as chatController from "./chat.controller.js";

const router = Router();

router.use(authenticate);

router.post("/message", validate(SendMessageBodySchema), chatController.sendMessage);
router.get("/history", chatController.getHistory);
router.delete("/session/:id", chatController.clearSession);

export default router;
```

- [ ] Commit

```bash
git add src/modules/chat/chat.routes.ts
git commit -m "feat: add chat routes with Zod validation"
```

---

## Task 5: Register schema import in swagger.ts + mount router in app.ts

- [ ] Add to side-effect imports in `src/docs/swagger.ts`

```typescript
import "../modules/chat/chat.schema.js";
```

- [ ] Add chat routes to `src/app.ts`

```typescript
import chatRoutes from "./modules/chat/chat.routes.js";
// ...
app.use("/api/chat", chatRoutes);
```

- [ ] Verify Zod rejects short message

```bash
curl -X POST http://localhost:3000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message":"","sessionId":"not-uuid","history":[]}'
# expected: 400 with fieldErrors for message and sessionId
```

- [ ] Confirm chat routes in Swagger UI

```bash
open http://localhost:3000/api/docs
# expected: POST /api/chat/message, GET /api/chat/history, DELETE /api/chat/session/{id}
```

- [ ] Commit

```bash
git add src/docs/swagger.ts src/app.ts
git commit -m "feat: register chat schema in Swagger and mount chat routes"
```
