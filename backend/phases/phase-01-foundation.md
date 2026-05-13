# Phase 01 — Express Foundation + Swagger Infrastructure

> **For agentic workers:** Use `superpowers:executing-plans` or `superpowers:subagent-driven-development` to implement task-by-task.

**Goal:** Get Express running with a health check, shared types, Zod validation middleware, and Swagger UI live at `/api/docs`.

**Architecture:** Two-file entry pattern — `app.ts` builds and exports the Express app, `index.ts` starts the HTTP server. A singleton `OpenAPIRegistry` lives in `src/docs/registry.ts`; every module's schema file imports it and registers its own paths. `src/docs/swagger.ts` collects all registrations and mounts Swagger UI.

**Tech Stack:** Express 5, TypeScript (ESNext/bundler), ts-node-dev, zod, @asteasolutions/zod-to-openapi, swagger-ui-express

---

## Install new packages

```bash
cd backend
npm install zod @asteasolutions/zod-to-openapi swagger-ui-express
npm install -D @types/swagger-ui-express
```

---

## Files

| Action | Path |
|--------|------|
| Create | `src/types/index.ts` |
| Create | `src/docs/registry.ts` |
| Create | `src/docs/swagger.ts` |
| Create | `src/middleware/validate.ts` |
| Create | `src/app.ts` |
| Create | `src/index.ts` |

---

## Task 1: Shared types

**File:** `src/types/index.ts`

- [ ] Create the file

```typescript
import type { Request } from "express";

export interface AuthUser {
  uid: string;
  email: string;
  role: string;
  dbId: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}
```

- [ ] Commit

```bash
git add src/types/index.ts
git commit -m "feat: add shared AuthRequest type"
```

---

## Task 2: OpenAPI registry singleton

**File:** `src/docs/registry.ts`

This file must be imported before any `.openapi()` call anywhere in the codebase — importing it triggers `extendZodWithOpenApi(z)` exactly once.

- [ ] Create the file

```typescript
import { OpenAPIRegistry, extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();
```

- [ ] Commit

```bash
git add src/docs/registry.ts
git commit -m "feat: add OpenAPI registry singleton"
```

---

## Task 3: Swagger document builder + UI setup

**File:** `src/docs/swagger.ts`

- [ ] Create the file

```typescript
import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import swaggerUi from "swagger-ui-express";
import type { Express } from "express";
import { registry } from "./registry.js";

// Side-effect imports — each file registers its paths with the registry.
// Add a new import here whenever a new module schema file is created.
// (populated in later phases)

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
    servers: [
      { url: "http://localhost:3000", description: "Local development" },
    ],
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
git commit -m "feat: add Swagger document builder and UI setup"
```

---

## Task 4: Zod validation middleware

**File:** `src/middleware/validate.ts`

- [ ] Create the file

```typescript
import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";

export type ValidationTarget = "body" | "query" | "params";

export const validate =
  (schema: ZodSchema, target: ValidationTarget = "body") =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      res.status(400).json({
        error: "Validation failed",
        issues: result.error.flatten().fieldErrors,
      });
      return;
    }
    // Replace with coerced/stripped data from Zod
    (req as Record<string, unknown>)[target] = result.data;
    next();
  };
```

- [ ] Commit

```bash
git add src/middleware/validate.ts
git commit -m "feat: add Zod validation middleware"
```

---

## Task 5: App factory

**File:** `src/app.ts`

- [ ] Create the file

```typescript
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { setupSwagger } from "./docs/swagger.js";

const app = express();

app.use(helmet());
app.use(cors({
  origin: `http://localhost:${process.env.FRONTEND_PORT || 3001}`,
  credentials: true,
}));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

setupSwagger(app);

// Module routes will be added in later phases here

export default app;
```

- [ ] Commit

```bash
git add src/app.ts
git commit -m "feat: add Express app factory with health route and Swagger UI"
```

---

## Task 6: Server entry point

**File:** `src/index.ts`

- [ ] Create the file

```typescript
import "dotenv/config";
import app from "./app.js";

const PORT = process.env.BACKEND_PORT || 3000;

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  console.log(`Swagger UI: http://localhost:${PORT}/api/docs`);
});
```

- [ ] Start the server and verify

```bash
npm run dev
```

```bash
# in another terminal:
curl http://localhost:3000/health
# expected: {"status":"ok","timestamp":"..."}

curl -s http://localhost:3000/api/docs.json | head -20
# expected: OpenAPI 3.0 JSON document

# open in browser: http://localhost:3000/api/docs
# expected: Swagger UI (empty — routes added in later phases)
```

- [ ] Commit

```bash
git add src/index.ts
git commit -m "feat: add server entry point with Swagger URL in startup log"
```
