# Phase 03 — Middleware Layer

> **For agentic workers:** Use `superpowers:executing-plans` or `superpowers:subagent-driven-development` to implement task-by-task.

**Goal:** Build the three core middleware pieces — Firebase token verification, global error handler, and rate limiter — then mount them all in `app.ts`. The Zod validation middleware was already created in Phase 01.

**Architecture:** `auth.ts` exports `authenticate` (verifies Firebase JWT, attaches `req.user`) and `requireRole` (role guard). `errorHandler.ts` is the last `app.use` in `app.ts`. `rateLimiter.ts` wraps `express-rate-limit`.

**Tech Stack:** firebase-admin, express-rate-limit, Express 5

**Prerequisites:** Phase 01 (app.ts, validate.ts), Phase 02 (firebase config)

---

## Files

| Action | Path |
|--------|------|
| Create | `src/middleware/auth.ts` |
| Create | `src/middleware/errorHandler.ts` |
| Create | `src/middleware/rateLimiter.ts` |
| Modify | `src/app.ts` |

---

## Task 1: Auth middleware

**File:** `src/middleware/auth.ts`

- [ ] Create the file

```typescript
import type { Response, NextFunction } from "express";
import { adminAuth } from "../config/firebase.js";
import { prisma } from "../../lib/db.js";
import type { AuthRequest } from "../types/index.js";

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const token = req.headers.authorization?.split("Bearer ")[1];
  if (!token) {
    res.status(401).json({ error: "No token provided" });
    return;
  }

  const decoded = await adminAuth.verifyIdToken(token);
  const dbUser = await prisma.user.findUnique({
    where: { firebaseUid: decoded.uid },
  });

  if (!dbUser) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  req.user = {
    uid: decoded.uid,
    email: decoded.email!,
    role: dbUser.role,
    dbId: dbUser.id,
  };
  next();
};

export const requireRole =
  (...roles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
```

- [ ] Commit

```bash
git add src/middleware/auth.ts
git commit -m "feat: add Firebase auth middleware"
```

---

## Task 2: Error handler

**File:** `src/middleware/errorHandler.ts`

- [ ] Create the file

```typescript
import type { Request, Response, NextFunction } from "express";

export const errorHandler = (
  err: Error & { status?: number },
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  console.error(err);
  const status = err.status ?? 500;
  res.status(status).json({ error: err.message || "Internal server error" });
};
```

- [ ] Commit

```bash
git add src/middleware/errorHandler.ts
git commit -m "feat: add global error handler middleware"
```

---

## Task 3: Rate limiter

**File:** `src/middleware/rateLimiter.ts`

- [ ] Create the file

```typescript
import rateLimit from "express-rate-limit";

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
```

- [ ] Commit

```bash
git add src/middleware/rateLimiter.ts
git commit -m "feat: add rate limiter middleware"
```

---

## Task 4: Mount all middleware in app.ts

**File:** `src/app.ts` — add rateLimiter before routes and errorHandler at the end

- [ ] Update `src/app.ts`

```typescript
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimiter } from "./middleware/rateLimiter.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { setupSwagger } from "./docs/swagger.js";

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

// Module routes will be added in later phases

app.use(errorHandler);

export default app;
```

- [ ] Restart server and verify health check still works

```bash
curl http://localhost:3000/health
# expected: {"status":"ok","timestamp":"..."}
```

- [ ] Verify rate limiter headers are present

```bash
curl -I http://localhost:3000/health
# expected: RateLimit-Limit and RateLimit-Remaining headers in response
```

- [ ] Commit

```bash
git add src/app.ts
git commit -m "feat: mount rate limiter and error handler in app"
```
