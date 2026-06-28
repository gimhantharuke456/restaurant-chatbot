# Backend Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill every gap between the existing codebase and the full platform specification — covering favorites, notifications, waitlist, dining preferences, user insights, account deletion, public reviews, promotions, restaurant portal extensions (availability, promotions, review replies, analytics, check-in, registration), admin extensions (suspend, refund, review management, announcements), and Python AI service extensions (general agent, cancel/modify via API, post-booking Neo4j update, guest message limiting).

**Architecture:** Express/TypeScript backend uses Prisma ORM on PostgreSQL with Firebase for availability (Firestore) and auth. Python FastAPI AI service uses LangGraph + LangChain with Vertex AI (Gemini) and Neo4j for preference graphs. All new Express routes follow the existing module pattern (schema → service → controller → routes). All new Python agents follow the existing agent pattern (state dict in → state dict out).

**Tech Stack:** Node.js/Express 5, Prisma 7, TypeScript 6, Stripe 22, Firebase Admin 13; Python FastAPI 0.136, LangChain-Google-VertexAI, LangGraph, Neo4j driver, httpx, asyncpg.

## Global Constraints

- All Express routes under `/api/*` — maintain existing prefix conventions
- All auth middleware uses `authenticate` (Firebase token) from `src/middleware/auth.ts`
- Role checks use `requireRole("ROLE")` — existing middleware
- All Prisma models use `String @id @default(uuid())`
- JSON arrays stored as `String @default("[]")` pattern only where already established; new models use native `Json` or proper relations
- Python agents receive and return `state: dict` — never mutate, always spread: `{**state, "key": value}`
- No `npm test` — skip test commands
- Working directory for Express: `/Users/gimhanrajapaksha/Desktop/projects/agent_project/restaurant-chatbot/backend`
- Working directory for Python: `/Users/gimhanrajapaksha/Desktop/projects/agent_project/restaurant-chatbot/ai-service`

---

## PHASE A: Database Schema (blocking — must complete before Express tasks)

### Task 1: Prisma Schema Migration

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Run: `npx prisma migrate dev --name backend-completion`
- Run: `npx prisma generate`

**What this adds:**
- `User`: `dateOfBirth`, `preferredLanguage`, `isActive`, `diningPreferences` (Json)
- New models: `Favorite`, `Notification`, `Waitlist`, `ReviewReply`, `Promotion`
- New enums: `NotificationType`, `WaitlistStatus`, `PromotionType`
- `ReservationStatus` gets `MODIFIED` and `CHECKED_IN` values
- `Review` gets `reply ReviewReply?` relation

- [ ] **Step 1: Replace schema.prisma with the complete updated version**

The full new schema (replace entire file):

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "postgresql"
}

model User {
  id                 String        @id @default(uuid())
  firebaseUid        String        @unique
  email              String        @unique
  name               String?
  phone              String?
  avatarUrl          String?
  dateOfBirth        DateTime?
  preferredLanguage  String?
  isActive           Boolean       @default(true)
  diningPreferences  Json?
  role               Role          @default(CUSTOMER)
  createdAt          DateTime      @default(now())
  updatedAt          DateTime      @updatedAt
  reservations       Reservation[]
  payments           Payment[]
  reviews            Review[]
  chatSessions       ChatSession[]
  managedRestaurants Restaurant[]  @relation("RestaurantAdmin")
  favorites          Favorite[]
  notifications      Notification[]
  waitlistEntries    Waitlist[]
}

enum Role {
  CUSTOMER
  RESTAURANT_ADMIN
  SYSTEM_ADMIN
}

model Restaurant {
  id           String        @id @default(uuid())
  name         String
  description  String?
  address      String
  area         String
  phone        String?
  email        String?
  website      String?
  cuisineTypes String        @default("[]")
  priceRange   PriceRange
  openingHours Json
  imageUrls    String        @default("[]")
  isActive     Boolean       @default(true)
  isVerified   Boolean       @default(false)
  avgRating    Float?
  totalReviews Int           @default(0)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  adminId      String
  admin        User          @relation("RestaurantAdmin", fields: [adminId], references: [id])
  menuItems    MenuItem[]
  reservations Reservation[]
  reviews      Review[]
  favorites    Favorite[]
  waitlistEntries Waitlist[]
  promotions   Promotion[]
  reviewReplies ReviewReply[]

  @@index([area])
}

enum PriceRange {
  BUDGET
  MODERATE
  EXPENSIVE
  FINE_DINING
}

model MenuItem {
  id           String     @id @default(uuid())
  restaurantId String
  restaurant   Restaurant @relation(fields: [restaurantId], references: [id])
  name         String
  description  String?
  price        Float
  category     String
  dietaryInfo  String     @default("[]")
  isAvailable  Boolean    @default(true)
  imageUrl     String?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
}

model Reservation {
  id              String            @id @default(uuid())
  userId          String
  user            User              @relation(fields: [userId], references: [id])
  restaurantId    String
  restaurant      Restaurant        @relation(fields: [restaurantId], references: [id])
  date            DateTime
  time            String
  partySize       Int
  specialRequests String?
  status          ReservationStatus @default(PENDING)
  firestoreId     String?           @unique
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  payment         Payment?
  review          Review?
}

enum ReservationStatus {
  PENDING
  CONFIRMED
  MODIFIED
  CHECKED_IN
  COMPLETED
  CANCELLED
  NO_SHOW
}

model Payment {
  id              String        @id @default(uuid())
  reservationId   String        @unique
  reservation     Reservation   @relation(fields: [reservationId], references: [id])
  userId          String
  user            User          @relation(fields: [userId], references: [id])
  amount          Float
  currency        String        @default("LKR")
  stripePaymentId String?       @unique
  status          PaymentStatus @default(PENDING)
  receiptUrl      String?
  checkoutUrl     String?
  orderItems      Json?
  refundId        String?
  refundedAt      DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

enum PaymentStatus {
  PENDING
  SUCCEEDED
  FAILED
  REFUNDED
}

model Review {
  id            String       @id @default(uuid())
  userId        String
  user          User         @relation(fields: [userId], references: [id])
  restaurantId  String
  restaurant    Restaurant   @relation(fields: [restaurantId], references: [id])
  reservationId String?      @unique
  reservation   Reservation? @relation(fields: [reservationId], references: [id])
  rating        Int
  comment       String?
  imageUrls     String       @default("[]")
  isVisible     Boolean      @default(true)
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  reply         ReviewReply?
}

model ReviewReply {
  id           String     @id @default(uuid())
  reviewId     String     @unique
  review       Review     @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  restaurantId String
  restaurant   Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  reply        String
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
}

model ChatSession {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  messages  Json
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model AdminLog {
  id          String   @id @default(uuid())
  adminId     String
  adminEmail  String
  action      String
  targetType  String
  targetId    String?
  details     String?
  ipAddress   String?
  createdAt   DateTime @default(now())

  @@index([createdAt])
  @@index([adminEmail])
}

model Favorite {
  id           String     @id @default(uuid())
  userId       String
  user         User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  restaurantId String
  restaurant   Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  collection   String     @default("Favorites")
  createdAt    DateTime   @default(now())

  @@unique([userId, restaurantId])
  @@index([userId])
}

model Notification {
  id        String           @id @default(uuid())
  userId    String
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      NotificationType
  title     String
  message   String
  isRead    Boolean          @default(false)
  data      Json?
  createdAt DateTime         @default(now())

  @@index([userId, isRead])
  @@index([createdAt])
}

enum NotificationType {
  RESERVATION_CONFIRMED
  RESERVATION_REMINDER
  RESERVATION_CANCELLED
  RESERVATION_MODIFIED
  RESERVATION_COMPLETED
  PAYMENT_CONFIRMED
  PAYMENT_FAILED
  REVIEW_RECEIVED
  PROMOTION
  SYSTEM_ANNOUNCEMENT
  WAITLIST_AVAILABLE
}

model Waitlist {
  id           String         @id @default(uuid())
  userId       String
  user         User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  restaurantId String
  restaurant   Restaurant     @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  date         DateTime
  time         String
  partySize    Int
  status       WaitlistStatus @default(WAITING)
  position     Int
  notifiedAt   DateTime?
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  @@index([restaurantId, date, status])
  @@index([userId])
}

enum WaitlistStatus {
  WAITING
  NOTIFIED
  EXPIRED
  CONVERTED
}

model Promotion {
  id            String        @id @default(uuid())
  restaurantId  String
  restaurant    Restaurant    @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  title         String
  description   String
  type          PromotionType
  discountValue Float?
  startDate     DateTime
  endDate       DateTime
  isActive      Boolean       @default(true)
  imageUrl      String?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@index([restaurantId, isActive])
  @@index([endDate])
}

enum PromotionType {
  DISCOUNT
  HAPPY_HOUR
  SPECIAL_EVENT
  SEASONAL
  COUPON
}
```

- [ ] **Step 2: Run migration**

```bash
cd /Users/gimhanrajapaksha/Desktop/projects/agent_project/restaurant-chatbot/backend
npx prisma migrate dev --name backend-completion
```

Expected: Migration applied successfully.

- [ ] **Step 3: Regenerate Prisma client**

```bash
npx prisma generate
```

Expected: Generated Prisma Client.

- [ ] **Step 4: Commit**

```bash
cd /Users/gimhanrajapaksha/Desktop/projects/agent_project/restaurant-chatbot
git add backend/prisma/
git commit -m "feat(db): add Favorite, Notification, Waitlist, ReviewReply, Promotion models; extend User and Reservation"
```

---

## PHASE B: Express Backend Extensions (run after Task 1)

### Task 2: Notification Service (infrastructure for other tasks)

**Files:**
- Create: `backend/src/lib/notifications.ts`

**Produces:** `createNotification(userId, type, title, message, data?)` — used by Tasks 3, 5, 6

- [ ] **Step 1: Create notification helper**

Create `/Users/gimhanrajapaksha/Desktop/projects/agent_project/restaurant-chatbot/backend/src/lib/notifications.ts`:

```typescript
import { prisma } from "./db.js";
import type { NotificationType } from "../generated/prisma/client.js";

export const createNotification = async (
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  data?: Record<string, unknown>,
): Promise<void> => {
  await prisma.notification.create({
    data: { userId, type, title, message, data: data ?? undefined },
  }).catch((err) => console.error("[notification] create failed (non-fatal):", err));
};
```

- [ ] **Step 2: Commit**

```bash
cd /Users/gimhanrajapaksha/Desktop/projects/agent_project/restaurant-chatbot
git add backend/src/lib/notifications.ts
git commit -m "feat(notifications): add createNotification helper"
```

---

### Task 3: User Module Extensions

**Files:**
- Modify: `backend/src/modules/user/user.service.ts`
- Modify: `backend/src/modules/user/user.schema.ts`
- Modify: `backend/src/modules/user/user.controller.ts`
- Modify: `backend/src/modules/user/user.routes.ts`

**New endpoints:**
- `GET  /api/users/me/preferences` — get dining preferences
- `PUT  /api/users/me/preferences` — set dining preferences
- `GET  /api/users/me/favorites` — list favorites (optional `?collection=` filter)
- `POST /api/users/me/favorites` — add favorite
- `DELETE /api/users/me/favorites/:restaurantId` — remove favorite
- `GET /api/users/me/favorites/:restaurantId/check` — returns `{ isFavorited: boolean, collection: string|null }`
- `GET  /api/users/me/reviews` — user's own reviews
- `GET  /api/users/me/notifications` — list notifications (paged)
- `PATCH /api/users/me/notifications/read-all` — mark all read
- `PATCH /api/users/me/notifications/:id/read` — mark one read
- `GET  /api/users/me/insights` — dining stats
- `DELETE /api/users/me` — delete account

- [ ] **Step 1: Add service functions**

Replace the full contents of `backend/src/modules/user/user.service.ts`:

```typescript
import { prisma } from "../../../lib/db.js";
import type { User } from "../../../generated/prisma/client.js";
import type { z } from "zod";
import type { UpdateProfileBodySchema, UpdatePreferencesBodySchema } from "./user.schema.js";

export type UpdateProfileInput = z.infer<typeof UpdateProfileBodySchema>;
export type UpdatePreferencesInput = z.infer<typeof UpdatePreferencesBodySchema>;

export const getUser = async (id: string): Promise<User | null> => {
  return prisma.user.findUnique({ where: { id } });
};

export const updateUser = async (id: string, data: UpdateProfileInput): Promise<User> => {
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

export const getDiningPreferences = async (id: string) => {
  const user = await prisma.user.findUnique({ where: { id }, select: { diningPreferences: true } });
  return user?.diningPreferences ?? null;
};

export const updateDiningPreferences = async (id: string, input: UpdatePreferencesInput) => {
  return prisma.user.update({ where: { id }, data: { diningPreferences: input as object } });
};

export const getFavorites = async (userId: string, collection?: string) => {
  return prisma.favorite.findMany({
    where: { userId, ...(collection ? { collection } : {}) },
    include: {
      restaurant: {
        select: {
          id: true, name: true, area: true, avgRating: true,
          cuisineTypes: true, imageUrls: true, priceRange: true, isActive: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const addFavorite = async (userId: string, restaurantId: string, collection: string) => {
  return prisma.favorite.upsert({
    where: { userId_restaurantId: { userId, restaurantId } },
    create: { userId, restaurantId, collection },
    update: { collection },
  });
};

export const removeFavorite = async (userId: string, restaurantId: string) => {
  await prisma.favorite.deleteMany({ where: { userId, restaurantId } });
};

export const checkFavorite = async (userId: string, restaurantId: string) => {
  const fav = await prisma.favorite.findUnique({
    where: { userId_restaurantId: { userId, restaurantId } },
  });
  return { isFavorited: !!fav, collection: fav?.collection ?? null };
};

export const getUserReviews = async (userId: string) => {
  return prisma.review.findMany({
    where: { userId, isVisible: true },
    include: {
      restaurant: { select: { id: true, name: true, imageUrls: true } },
      reply: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

export const getNotifications = async (userId: string, opts: { page?: number; limit?: number } = {}) => {
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 20;
  const skip = (page - 1) * limit;
  const [data, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);
  return { data, total, page, limit, unreadCount };
};

export const markNotificationRead = async (id: string, userId: string) => {
  return prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
};

export const markAllNotificationsRead = async (userId: string) => {
  return prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
};

export const getUserInsights = async (userId: string) => {
  const [reservations, reviews, totalSpentAgg] = await Promise.all([
    prisma.reservation.findMany({
      where: { userId, status: { in: ["COMPLETED", "CHECKED_IN"] } },
      include: { restaurant: { select: { name: true, cuisineTypes: true, area: true } } },
    }),
    prisma.review.findMany({ where: { userId }, select: { rating: true } }),
    prisma.payment.aggregate({ where: { userId, status: "SUCCEEDED" }, _sum: { amount: true } }),
  ]);

  const cuisineTally: Record<string, number> = {};
  const restaurantTally: Record<string, { name: string; count: number }> = {};
  const monthTally: Record<string, number> = {};

  for (const r of reservations) {
    const types: string[] = JSON.parse(r.restaurant.cuisineTypes);
    for (const c of types) cuisineTally[c] = (cuisineTally[c] ?? 0) + 1;
    restaurantTally[r.restaurantId] = {
      name: r.restaurant.name,
      count: (restaurantTally[r.restaurantId]?.count ?? 0) + 1,
    };
    const month = r.date.toISOString().slice(0, 7);
    monthTally[month] = (monthTally[month] ?? 0) + 1;
  }

  const topCuisines = Object.entries(cuisineTally)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([cuisine, count]) => ({ cuisine, count }));

  const topRestaurants = Object.entries(restaurantTally)
    .sort((a, b) => b[1].count - a[1].count).slice(0, 5)
    .map(([id, { name, count }]) => ({ id, name, count }));

  const monthlyDining = Object.entries(monthTally)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, count]) => ({ month, count }));

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null;

  return {
    totalDiningExperiences: reservations.length,
    totalSpent: totalSpentAgg._sum.amount ?? 0,
    avgRatingGiven: avgRating,
    topCuisines,
    topRestaurants,
    monthlyDining,
  };
};

export const deleteAccount = async (userId: string) => {
  await prisma.user.delete({ where: { id: userId } });
};
```

- [ ] **Step 2: Update user.schema.ts**

Replace the full contents of `backend/src/modules/user/user.schema.ts`:

```typescript
import { z } from "zod";

export const UpdateProfileBodySchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  dateOfBirth: z.string().datetime().optional(),
  preferredLanguage: z.string().optional(),
});

export const UpdatePreferencesBodySchema = z.object({
  cuisines: z.array(z.string()).default([]),
  dietaryRestrictions: z.array(z.string()).default([]),
  budgetPreference: z.enum(["BUDGET", "MODERATE", "EXPENSIVE", "FINE_DINING"]).optional(),
  preferredDiningTimes: z.array(z.string()).default([]),
  seatingPreferences: z.array(z.string()).default([]),
});

export const AddFavoriteBodySchema = z.object({
  restaurantId: z.string().uuid(),
  collection: z.string().default("Favorites"),
});

export const NotificationPageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
```

- [ ] **Step 3: Update user.controller.ts**

Replace the full contents of `backend/src/modules/user/user.controller.ts`:

```typescript
import type { Request, Response, NextFunction } from "express";
import * as userService from "./user.service.js";
import { validate } from "../../middleware/validate.js";
import {
  UpdateProfileBodySchema,
  UpdatePreferencesBodySchema,
  AddFavoriteBodySchema,
  NotificationPageQuerySchema,
} from "./user.schema.js";

declare module "express" {
  interface Request { user?: { id: string; email: string; role: string } }
}

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userService.getUser(req.user!.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) { next(err); }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = UpdateProfileBodySchema.parse(req.body);
    const user = await userService.updateUser(req.user!.id, body);
    res.json(user);
  } catch (err) { next(err); }
};

export const getProfileWithReservations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userService.getUserWithReservations(req.user!.id);
    res.json(user);
  } catch (err) { next(err); }
};

export const getPreferences = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prefs = await userService.getDiningPreferences(req.user!.id);
    res.json(prefs ?? {});
  } catch (err) { next(err); }
};

export const updatePreferences = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = UpdatePreferencesBodySchema.parse(req.body);
    const user = await userService.updateDiningPreferences(req.user!.id, body);
    res.json({ diningPreferences: user.diningPreferences });
  } catch (err) { next(err); }
};

export const getFavorites = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const collection = req.query.collection as string | undefined;
    const favorites = await userService.getFavorites(req.user!.id, collection);
    res.json(favorites);
  } catch (err) { next(err); }
};

export const addFavorite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = AddFavoriteBodySchema.parse(req.body);
    const fav = await userService.addFavorite(req.user!.id, body.restaurantId, body.collection);
    res.status(201).json(fav);
  } catch (err) { next(err); }
};

export const removeFavorite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await userService.removeFavorite(req.user!.id, req.params.restaurantId);
    res.status(204).send();
  } catch (err) { next(err); }
};

export const checkFavorite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await userService.checkFavorite(req.user!.id, req.params.restaurantId);
    res.json(result);
  } catch (err) { next(err); }
};

export const getUserReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reviews = await userService.getUserReviews(req.user!.id);
    res.json(reviews);
  } catch (err) { next(err); }
};

export const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = NotificationPageQuerySchema.parse(req.query);
    const result = await userService.getNotifications(req.user!.id, query);
    res.json(result);
  } catch (err) { next(err); }
};

export const markNotificationRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await userService.markNotificationRead(req.params.id, req.user!.id);
    res.status(204).send();
  } catch (err) { next(err); }
};

export const markAllNotificationsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await userService.markAllNotificationsRead(req.user!.id);
    res.status(204).send();
  } catch (err) { next(err); }
};

export const getUserInsights = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const insights = await userService.getUserInsights(req.user!.id);
    res.json(insights);
  } catch (err) { next(err); }
};

export const deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await userService.deleteAccount(req.user!.id);
    res.status(204).send();
  } catch (err) { next(err); }
};
```

- [ ] **Step 4: Replace user.routes.ts**

```typescript
import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import * as userController from "./user.controller.js";

const router = Router();

router.use(authenticate);

router.get("/me", userController.getProfile);
router.put("/me", userController.updateProfile);
router.get("/me/full", userController.getProfileWithReservations);
router.delete("/me", userController.deleteAccount);

router.get("/me/preferences", userController.getPreferences);
router.put("/me/preferences", userController.updatePreferences);

router.get("/me/favorites", userController.getFavorites);
router.post("/me/favorites", userController.addFavorite);
router.delete("/me/favorites/:restaurantId", userController.removeFavorite);
router.get("/me/favorites/:restaurantId/check", userController.checkFavorite);

router.get("/me/reviews", userController.getUserReviews);

router.get("/me/notifications", userController.getNotifications);
router.patch("/me/notifications/read-all", userController.markAllNotificationsRead);
router.patch("/me/notifications/:id/read", userController.markNotificationRead);

router.get("/me/insights", userController.getUserInsights);

export default router;
```

- [ ] **Step 5: Wire notification triggers into reservation.service.ts**

At the top of `backend/src/modules/reservation/reservation.service.ts`, add the import:

```typescript
import { createNotification } from "../../../lib/notifications.js";
```

In `createReservation`, after the `prisma.reservation.create` call succeeds, add:

```typescript
  createNotification(
    userId,
    "RESERVATION_CONFIRMED",
    "Reservation Confirmed",
    `Your reservation at ${reservation.restaurant.name} on ${input.date} at ${input.time} is confirmed.`,
    { reservationId: reservation.id, restaurantId: input.restaurantId },
  ).catch(() => {});
```

In `cancelReservation`, after `prisma.reservation.update` succeeds, add:

```typescript
  createNotification(
    reservation.userId,
    "RESERVATION_CANCELLED",
    "Reservation Cancelled",
    `Your reservation at ${reservation.restaurant.name} has been cancelled.`,
    { reservationId: id },
  ).catch(() => {});
```

- [ ] **Step 6: Wire notification into payment webhook**

In `backend/src/modules/payment/payment.service.ts` inside the `checkout.session.completed` handler, after updating payment status to SUCCEEDED, add:

```typescript
    if (payment) {
      createNotification(
        payment.userId,
        "PAYMENT_CONFIRMED",
        "Payment Confirmed",
        `Payment of LKR ${payment.amount.toLocaleString()} for your reservation at ${payment.reservation.restaurant.name} was successful.`,
        { paymentId: payment.id, reservationId: payment.reservationId },
      ).catch(() => {});
      // ... existing sendEmail ...
    }
```

Add import at top:
```typescript
import { createNotification } from "../../../lib/notifications.js";
```

- [ ] **Step 7: Commit**

```bash
cd /Users/gimhanrajapaksha/Desktop/projects/agent_project/restaurant-chatbot
git add backend/src/modules/user/ backend/src/modules/reservation/reservation.service.ts backend/src/modules/payment/payment.service.ts
git commit -m "feat(users): add favorites, preferences, notifications, insights, delete account endpoints"
```

---

### Task 4: Restaurant Module Extensions

**Files:**
- Modify: `backend/src/modules/restaurant/restaurant.service.ts`
- Modify: `backend/src/modules/restaurant/restaurant.schema.ts`
- Modify: `backend/src/modules/restaurant/restaurant.controller.ts`
- Modify: `backend/src/modules/restaurant/restaurant.routes.ts`

**New endpoints:**
- `GET /api/restaurants/:id/reviews` — public paginated reviews with replies
- `GET /api/restaurants/:id/promotions` — active promotions for a restaurant
- Enhanced `GET /api/restaurants` — adds `cuisine`, `minRating`, `search` query params

- [ ] **Step 1: Update restaurant.schema.ts — add cuisine, minRating, search to query**

In `backend/src/modules/restaurant/restaurant.schema.ts`, find `RestaurantQuerySchema` and replace it with:

```typescript
export const RestaurantQuerySchema = z
  .object({
    area: z.string().optional(),
    priceRange: z.enum(["BUDGET", "MODERATE", "EXPENSIVE", "FINE_DINING"]).optional(),
    cuisine: z.string().optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .openapi("RestaurantQuery");

export const ReviewQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(20).default(10),
  rating: z.coerce.number().int().min(1).max(5).optional(),
});
```

- [ ] **Step 2: Update restaurant.service.ts — enhanced list, add reviews and promotions functions**

Replace the full contents of `backend/src/modules/restaurant/restaurant.service.ts`:

```typescript
import { prisma } from "../../../lib/db.js";
import { adminFirestore } from "../../config/firebase.js";
import type { PriceRange, Restaurant } from "../../../generated/prisma/client.js";
import type { z } from "zod";
import type {
  RestaurantQuerySchema,
  CreateRestaurantBodySchema,
  UpdateRestaurantBodySchema,
  ReviewQuerySchema,
} from "./restaurant.schema.js";

export type RestaurantFilters = z.infer<typeof RestaurantQuerySchema>;
export type CreateRestaurantInput = z.infer<typeof CreateRestaurantBodySchema>;
export type UpdateRestaurantInput = z.infer<typeof UpdateRestaurantBodySchema>;
export type ReviewQueryInput = z.infer<typeof ReviewQuerySchema>;

export const listRestaurants = async (filters: RestaurantFilters = {}) => {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { isActive: true };
  if (filters.area) where["area"] = { contains: filters.area, mode: "insensitive" };
  if (filters.priceRange) where["priceRange"] = filters.priceRange as PriceRange;
  if (filters.cuisine) where["cuisineTypes"] = { contains: filters.cuisine, mode: "insensitive" };
  if (filters.minRating) where["avgRating"] = { gte: filters.minRating };
  if (filters.search) {
    where["OR"] = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
      { area: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const [restaurants, total] = await Promise.all([
    prisma.restaurant.findMany({
      where,
      orderBy: { avgRating: "desc" },
      skip,
      take: limit,
    }),
    prisma.restaurant.count({ where }),
  ]);

  return { data: restaurants.map(parseRestaurant), total, page, limit };
};

export const getRestaurantById = async (id: string) => {
  const r = await prisma.restaurant.findUnique({ where: { id } });
  return r ? parseRestaurant(r) : null;
};

export const createRestaurant = async (input: CreateRestaurantInput, adminId: string) => {
  const r = await prisma.restaurant.create({
    data: {
      ...input,
      adminId,
      cuisineTypes: JSON.stringify(input.cuisineTypes),
      imageUrls: JSON.stringify(input.imageUrls),
      openingHours: JSON.parse(JSON.stringify(input.openingHours)),
    },
  });
  return parseRestaurant(r);
};

export const updateRestaurant = async (id: string, input: UpdateRestaurantInput) => {
  const data: Record<string, unknown> = { ...input };
  if (input.cuisineTypes) data["cuisineTypes"] = JSON.stringify(input.cuisineTypes);
  if (input.imageUrls) data["imageUrls"] = JSON.stringify(input.imageUrls);
  const r = await prisma.restaurant.update({ where: { id }, data });
  return parseRestaurant(r);
};

export const getAvailability = async (restaurantId: string, date: string): Promise<unknown[]> => {
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

export const getRestaurantReviews = async (restaurantId: string, opts: ReviewQueryInput) => {
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 10;
  const skip = (page - 1) * limit;
  const where = {
    restaurantId,
    isVisible: true,
    ...(opts.rating ? { rating: opts.rating } : {}),
  };
  const [data, total, avgAgg] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        user: { select: { name: true, avatarUrl: true } },
        reply: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.review.count({ where }),
    prisma.review.aggregate({ where: { restaurantId, isVisible: true }, _avg: { rating: true } }),
  ]);
  return { data, total, page, limit, avgRating: avgAgg._avg.rating };
};

export const getActivePromotions = async (restaurantId: string) => {
  const now = new Date();
  return prisma.promotion.findMany({
    where: { restaurantId, isActive: true, startDate: { lte: now }, endDate: { gte: now } },
    orderBy: { createdAt: "desc" },
  });
};

const parseRestaurant = (r: Restaurant) => ({
  ...r,
  cuisineTypes: JSON.parse(r.cuisineTypes) as string[],
  imageUrls: JSON.parse(r.imageUrls) as string[],
});
```

- [ ] **Step 3: Update restaurant.controller.ts — add getReviews and getPromotions**

Add to `backend/src/modules/restaurant/restaurant.controller.ts` (append before the export default if any, or as new exports):

First read the current controller, then add these two handlers:

```typescript
export const getRestaurantReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ReviewQuerySchema } = await import("./restaurant.schema.js");
    const opts = ReviewQuerySchema.parse(req.query);
    const result = await restaurantService.getRestaurantReviews(req.params.id, opts);
    res.json(result);
  } catch (err) { next(err); }
};

export const getRestaurantPromotions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const promotions = await restaurantService.getActivePromotions(req.params.id);
    res.json(promotions);
  } catch (err) { next(err); }
};
```

Also update the `getRestaurants` handler to handle the new paginated response format:

```typescript
export const getRestaurants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { RestaurantQuerySchema } = await import("./restaurant.schema.js");
    const filters = RestaurantQuerySchema.parse(req.query);
    const result = await restaurantService.listRestaurants(filters);
    res.json(result);
  } catch (err) { next(err); }
};
```

- [ ] **Step 4: Add routes to restaurant.routes.ts**

Add before `export default router;`:

```typescript
router.get("/:id/reviews", restaurantController.getRestaurantReviews);
router.get("/:id/promotions", restaurantController.getRestaurantPromotions);
```

Also update the `validate` call on `GET /` to use the updated `RestaurantQuerySchema`.

- [ ] **Step 5: Commit**

```bash
cd /Users/gimhanrajapaksha/Desktop/projects/agent_project/restaurant-chatbot
git add backend/src/modules/restaurant/
git commit -m "feat(restaurants): add public reviews, promotions endpoints; add cuisine/rating/search filters to listing"
```

---

### Task 5: Review Module — Delete Route

**Files:**
- Modify: `backend/src/modules/review/review.service.ts`
- Modify: `backend/src/modules/review/review.controller.ts`
- Modify: `backend/src/modules/reservation/reservation.routes.ts`

- [ ] **Step 1: Add deleteReview to review.service.ts**

Add at the end of `backend/src/modules/review/review.service.ts`:

```typescript
export const deleteReview = async (reservationId: string, userId: string) => {
  const review = await prisma.review.findUnique({
    where: { reservationId },
    include: { reservation: { select: { restaurantId: true } } },
  });
  if (!review) throw Object.assign(new Error("Review not found"), { status: 404 });
  if (review.userId !== userId) throw Object.assign(new Error("Forbidden"), { status: 403 });

  await prisma.review.delete({ where: { reservationId } });
  await recalcRestaurantRating(review.restaurantId);
};
```

- [ ] **Step 2: Add deleteReview to review.controller.ts**

Add at the end of `backend/src/modules/review/review.controller.ts`:

```typescript
export const deleteReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as Request & { user?: { id: string } }).user!.id;
    await reviewService.deleteReview(req.params.reservationId, userId);
    res.status(204).send();
  } catch (err) { next(err); }
};
```

- [ ] **Step 3: Add DELETE route in reservation.routes.ts**

Add after the `PUT /:reservationId/review` line:

```typescript
router.delete("/:reservationId/review", reviewController.deleteReview);
```

- [ ] **Step 4: Commit**

```bash
cd /Users/gimhanrajapaksha/Desktop/projects/agent_project/restaurant-chatbot
git add backend/src/modules/review/ backend/src/modules/reservation/reservation.routes.ts
git commit -m "feat(reviews): add delete review endpoint"
```

---

### Task 6: Admin Module Extensions

**Files:**
- Modify: `backend/src/modules/admin/admin.service.ts`
- Modify: `backend/src/modules/admin/admin.controller.ts`
- Modify: `backend/src/modules/admin/admin.routes.ts`
- Modify: `backend/src/modules/admin/admin.schema.ts`

**New endpoints:**
- `PATCH /api/admin/users/:id/suspend` — set isActive=false
- `PATCH /api/admin/users/:id/activate` — set isActive=true
- `POST  /api/admin/payments/:id/refund` — issue Stripe refund
- `GET   /api/admin/reviews` — list all reviews (paginated)
- `PATCH /api/admin/reviews/:id/hide` — hide review (isVisible=false)
- `DELETE /api/admin/reviews/:id` — delete review permanently
- `POST  /api/admin/notifications` — broadcast system announcement to all or role-filtered users

- [ ] **Step 1: Add service functions to admin.service.ts**

Add these functions at the end of `backend/src/modules/admin/admin.service.ts`:

```typescript
export const suspendUser = async (id: string) => {
  return prisma.user.update({ where: { id }, data: { isActive: false } });
};

export const activateUser = async (id: string) => {
  return prisma.user.update({ where: { id }, data: { isActive: true } });
};

export interface ReviewListOptions {
  page?: number;
  limit?: number;
  rating?: number;
  isVisible?: boolean;
}

export const getAllReviews = async (opts: ReviewListOptions = {}) => {
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 25;
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = {};
  if (opts.rating !== undefined) where.rating = opts.rating;
  if (opts.isVisible !== undefined) where.isVisible = opts.isVisible;
  const [data, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        restaurant: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.review.count({ where }),
  ]);
  return { data, total, page, limit };
};

export const hideReview = async (id: string) => {
  return prisma.review.update({ where: { id }, data: { isVisible: false } });
};

export const deleteReview = async (id: string) => {
  const review = await prisma.review.findUniqueOrThrow({ where: { id } });
  await prisma.review.delete({ where: { id } });
  const agg = await prisma.review.aggregate({
    where: { restaurantId: review.restaurantId, isVisible: true },
    _avg: { rating: true },
    _count: { id: true },
  });
  await prisma.restaurant.update({
    where: { id: review.restaurantId },
    data: { avgRating: agg._avg.rating, totalReviews: agg._count.id },
  });
};

export const refundPayment = async (paymentId: string) => {
  const { stripe } = await import("../../config/stripe.js");
  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
  if (payment.status !== "SUCCEEDED") {
    throw Object.assign(new Error("Only succeeded payments can be refunded"), { status: 400 });
  }
  if (!payment.stripePaymentId) {
    throw Object.assign(new Error("No Stripe payment ID"), { status: 400 });
  }
  const session = await stripe.checkout.sessions.retrieve(payment.stripePaymentId);
  const refund = await stripe.refunds.create({ payment_intent: session.payment_intent as string });
  return prisma.payment.update({
    where: { id: paymentId },
    data: { status: "REFUNDED", refundId: refund.id, refundedAt: new Date() },
  });
};

export const broadcastAnnouncement = async (title: string, message: string, role?: string) => {
  const where = role ? { role: role as "CUSTOMER" | "RESTAURANT_ADMIN" | "SYSTEM_ADMIN" } : {};
  const users = await prisma.user.findMany({ where, select: { id: true } });
  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      type: "SYSTEM_ANNOUNCEMENT" as const,
      title,
      message,
    })),
  });
  return { sent: users.length };
};
```

- [ ] **Step 2: Add controller handlers to admin.controller.ts**

Add at the end of `backend/src/modules/admin/admin.controller.ts`:

```typescript
export const suspendUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await adminService.suspendUser(req.params.id);
    await adminService.logAdminAction(req.user!.id, req.user!.email, "SUSPEND_USER", "User", req.params.id, undefined, req.ip);
    res.json(user);
  } catch (err) { next(err); }
};

export const activateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await adminService.activateUser(req.params.id);
    await adminService.logAdminAction(req.user!.id, req.user!.email, "ACTIVATE_USER", "User", req.params.id, undefined, req.ip);
    res.json(user);
  } catch (err) { next(err); }
};

export const getAllReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const opts = {
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      rating: req.query.rating ? Number(req.query.rating) : undefined,
      isVisible: req.query.isVisible !== undefined ? req.query.isVisible === "true" : undefined,
    };
    const result = await adminService.getAllReviews(opts);
    res.json(result);
  } catch (err) { next(err); }
};

export const hideReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const review = await adminService.hideReview(req.params.id);
    await adminService.logAdminAction(req.user!.id, req.user!.email, "HIDE_REVIEW", "Review", req.params.id, undefined, req.ip);
    res.json(review);
  } catch (err) { next(err); }
};

export const deleteReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await adminService.deleteReview(req.params.id);
    await adminService.logAdminAction(req.user!.id, req.user!.email, "DELETE_REVIEW", "Review", req.params.id, undefined, req.ip);
    res.status(204).send();
  } catch (err) { next(err); }
};

export const refundPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payment = await adminService.refundPayment(req.params.id);
    await adminService.logAdminAction(req.user!.id, req.user!.email, "REFUND_PAYMENT", "Payment", req.params.id, undefined, req.ip);
    res.json(payment);
  } catch (err) { next(err); }
};

export const broadcastAnnouncement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, message, role } = req.body as { title: string; message: string; role?: string };
    if (!title || !message) return res.status(400).json({ error: "title and message required" });
    const result = await adminService.broadcastAnnouncement(title, message, role);
    await adminService.logAdminAction(req.user!.id, req.user!.email, "BROADCAST_ANNOUNCEMENT", "System", undefined, `${result.sent} recipients`, req.ip);
    res.json(result);
  } catch (err) { next(err); }
};
```

- [ ] **Step 3: Add routes to admin.routes.ts**

Add before `export default router;`:

```typescript
// User suspend/activate
router.patch("/users/:id/suspend", adminController.suspendUser);
router.patch("/users/:id/activate", adminController.activateUser);

// Reviews
router.get("/reviews", adminController.getAllReviews);
router.patch("/reviews/:id/hide", adminController.hideReview);
router.delete("/reviews/:id", adminController.deleteReview);

// Refunds
router.post("/payments/:id/refund", adminController.refundPayment);

// Announcements
router.post("/notifications", adminController.broadcastAnnouncement);
```

- [ ] **Step 4: Commit**

```bash
cd /Users/gimhanrajapaksha/Desktop/projects/agent_project/restaurant-chatbot
git add backend/src/modules/admin/
git commit -m "feat(admin): add suspend/activate user, review management, payment refund, broadcast announcements"
```

---

### Task 7: Restaurant Portal Extensions

**Files:**
- Modify: `backend/src/modules/restaurant-portal/portal.service.ts`
- Modify: `backend/src/modules/restaurant-portal/portal.controller.ts`
- Modify: `backend/src/modules/restaurant-portal/portal.routes.ts`

**New endpoints:**
- `POST   /api/restaurant-portal/restaurant` — register restaurant (first-time setup)
- `GET    /api/restaurant-portal/availability/:date` — get slots for a date
- `PUT    /api/restaurant-portal/availability/:date` — set/overwrite slots for a date (writes to Firestore)
- `GET    /api/restaurant-portal/promotions` — list restaurant's promotions
- `POST   /api/restaurant-portal/promotions` — create promotion
- `PUT    /api/restaurant-portal/promotions/:id` — update promotion
- `DELETE /api/restaurant-portal/promotions/:id` — delete promotion
- `POST   /api/restaurant-portal/reviews/:id/reply` — create/update reply to review
- `GET    /api/restaurant-portal/analytics` — peak hours, top menu items, reservation trends
- `PATCH  /api/restaurant-portal/reservations/:id/checkin` — check in a guest

- [ ] **Step 1: Add all service functions to portal.service.ts**

Append to `backend/src/modules/restaurant-portal/portal.service.ts`:

```typescript
import { adminFirestore } from "../../config/firebase.js";
import { createNotification } from "../../../lib/notifications.js";

// ── Restaurant registration ───────────────────────────────────────────────────

interface RegisterRestaurantInput {
  name: string;
  description?: string;
  address: string;
  area: string;
  phone?: string;
  email?: string;
  website?: string;
  cuisineTypes: string[];
  priceRange: "BUDGET" | "MODERATE" | "EXPENSIVE" | "FINE_DINING";
  openingHours: object;
  imageUrls?: string[];
}

export const registerRestaurant = async (adminId: string, input: RegisterRestaurantInput) => {
  const existing = await prisma.restaurant.findFirst({ where: { adminId } });
  if (existing) throw Object.assign(new Error("Restaurant already registered"), { status: 409 });
  return prisma.restaurant.create({
    data: {
      adminId,
      name: input.name,
      description: input.description ?? null,
      address: input.address,
      area: input.area,
      phone: input.phone ?? null,
      email: input.email ?? null,
      website: input.website ?? null,
      cuisineTypes: JSON.stringify(input.cuisineTypes),
      priceRange: input.priceRange,
      openingHours: input.openingHours as object,
      imageUrls: JSON.stringify(input.imageUrls ?? []),
    },
  });
};

// ── Availability management ───────────────────────────────────────────────────

export interface AvailabilitySlot {
  time: string;
  totalTables: number;
  bookedTables: number;
  available: boolean;
}

export const getAvailabilityForDate = async (adminId: string, date: string): Promise<AvailabilitySlot[]> => {
  const restaurant = await prisma.restaurant.findFirst({ where: { adminId } });
  if (!restaurant) return [];
  const doc = await adminFirestore
    .collection("restaurants").doc(restaurant.id)
    .collection("availability").doc(date)
    .get();
  return doc.exists ? (doc.data()?.slots ?? []) : [];
};

export const setAvailabilityForDate = async (
  adminId: string,
  date: string,
  slots: AvailabilitySlot[],
) => {
  const restaurant = await prisma.restaurant.findFirst({ where: { adminId } });
  if (!restaurant) throw Object.assign(new Error("Restaurant not found"), { status: 404 });
  await adminFirestore
    .collection("restaurants").doc(restaurant.id)
    .collection("availability").doc(date)
    .set({ slots, updatedAt: new Date().toISOString() });
  return { restaurantId: restaurant.id, date, slots };
};

// ── Promotions ────────────────────────────────────────────────────────────────

interface PromotionInput {
  title: string;
  description: string;
  type: "DISCOUNT" | "HAPPY_HOUR" | "SPECIAL_EVENT" | "SEASONAL" | "COUPON";
  discountValue?: number;
  startDate: string;
  endDate: string;
  isActive?: boolean;
  imageUrl?: string;
}

export const getMyPromotions = async (adminId: string) => {
  const restaurant = await prisma.restaurant.findFirst({ where: { adminId } });
  if (!restaurant) return [];
  return prisma.promotion.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: { createdAt: "desc" },
  });
};

export const createPromotion = async (adminId: string, input: PromotionInput) => {
  const restaurant = await prisma.restaurant.findFirst({ where: { adminId } });
  if (!restaurant) throw Object.assign(new Error("Restaurant not found"), { status: 404 });
  return prisma.promotion.create({
    data: {
      restaurantId: restaurant.id,
      title: input.title,
      description: input.description,
      type: input.type,
      discountValue: input.discountValue ?? null,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      isActive: input.isActive ?? true,
      imageUrl: input.imageUrl ?? null,
    },
  });
};

export const updatePromotion = async (adminId: string, promotionId: string, input: Partial<PromotionInput>) => {
  const restaurant = await prisma.restaurant.findFirst({ where: { adminId } });
  if (!restaurant) throw Object.assign(new Error("Restaurant not found"), { status: 404 });
  const promo = await prisma.promotion.findFirst({ where: { id: promotionId, restaurantId: restaurant.id } });
  if (!promo) throw Object.assign(new Error("Promotion not found"), { status: 404 });
  return prisma.promotion.update({
    where: { id: promotionId },
    data: {
      ...(input.title && { title: input.title }),
      ...(input.description && { description: input.description }),
      ...(input.type && { type: input.type }),
      ...(input.discountValue !== undefined && { discountValue: input.discountValue }),
      ...(input.startDate && { startDate: new Date(input.startDate) }),
      ...(input.endDate && { endDate: new Date(input.endDate) }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl }),
    },
  });
};

export const deletePromotion = async (adminId: string, promotionId: string) => {
  const restaurant = await prisma.restaurant.findFirst({ where: { adminId } });
  if (!restaurant) throw Object.assign(new Error("Restaurant not found"), { status: 404 });
  const promo = await prisma.promotion.findFirst({ where: { id: promotionId, restaurantId: restaurant.id } });
  if (!promo) throw Object.assign(new Error("Promotion not found"), { status: 404 });
  return prisma.promotion.delete({ where: { id: promotionId } });
};

// ── Review replies ────────────────────────────────────────────────────────────

export const replyToReview = async (adminId: string, reviewId: string, reply: string) => {
  const restaurant = await prisma.restaurant.findFirst({ where: { adminId } });
  if (!restaurant) throw Object.assign(new Error("Restaurant not found"), { status: 404 });
  const review = await prisma.review.findFirst({ where: { id: reviewId, restaurantId: restaurant.id } });
  if (!review) throw Object.assign(new Error("Review not found"), { status: 404 });
  const result = await prisma.reviewReply.upsert({
    where: { reviewId },
    create: { reviewId, restaurantId: restaurant.id, reply },
    update: { reply },
  });
  createNotification(
    review.userId,
    "REVIEW_RECEIVED",
    "Restaurant replied to your review",
    `${restaurant.name} has responded to your review.`,
    { restaurantId: restaurant.id, reviewId },
  ).catch(() => {});
  return result;
};

// ── Analytics ─────────────────────────────────────────────────────────────────

export const getPortalAnalytics = async (adminId: string) => {
  const restaurant = await prisma.restaurant.findFirst({ where: { adminId } });
  if (!restaurant) return null;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [reservationsByDay, reservationsByTime, payments, menuRevenue, statusBreakdown] = await Promise.all([
    // Daily reservation trend (last 30 days)
    prisma.reservation.groupBy({
      by: ["date"],
      where: { restaurantId: restaurant.id, date: { gte: thirtyDaysAgo } },
      _count: { id: true },
      orderBy: { date: "asc" },
    }),
    // Reservations by time (peak hours)
    prisma.reservation.groupBy({
      by: ["time"],
      where: { restaurantId: restaurant.id },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
    // Revenue for last 30 days
    prisma.payment.findMany({
      where: {
        reservation: { restaurantId: restaurant.id },
        status: "SUCCEEDED",
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { amount: true, orderItems: true, createdAt: true },
    }),
    // Top menu items by order count from payment orderItems
    prisma.payment.findMany({
      where: { reservation: { restaurantId: restaurant.id }, status: "SUCCEEDED" },
      select: { orderItems: true },
    }),
    // Reservation status breakdown
    prisma.reservation.groupBy({
      by: ["status"],
      where: { restaurantId: restaurant.id },
      _count: { id: true },
    }),
  ]);

  // Tally menu item revenue from orderItems JSON
  const itemTally: Record<string, { name: string; count: number; revenue: number }> = {};
  for (const p of menuRevenue) {
    const items = p.orderItems as Array<{ name: string; price: number; quantity: number }> | null;
    if (!items) continue;
    for (const item of items) {
      if (!itemTally[item.name]) itemTally[item.name] = { name: item.name, count: 0, revenue: 0 };
      itemTally[item.name].count += item.quantity;
      itemTally[item.name].revenue += item.price * item.quantity;
    }
  }
  const topMenuItems = Object.values(itemTally).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  const totalRevenue = payments.reduce((s, p) => s + p.amount, 0);

  return {
    reservationTrend: reservationsByDay.map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      count: r._count.id,
    })),
    peakHours: reservationsByTime.slice(0, 10).map((r) => ({ time: r.time, count: r._count.id })),
    totalRevenue,
    topMenuItems,
    statusBreakdown: statusBreakdown.map((r) => ({ status: r.status, count: r._count.id })),
  };
};

// ── Check-in ──────────────────────────────────────────────────────────────────

export const checkInReservation = async (adminId: string, reservationId: string) => {
  const restaurant = await prisma.restaurant.findFirst({ where: { adminId } });
  if (!restaurant) throw Object.assign(new Error("Restaurant not found"), { status: 404 });
  const reservation = await prisma.reservation.findFirst({
    where: { id: reservationId, restaurantId: restaurant.id, status: "CONFIRMED" },
  });
  if (!reservation) throw Object.assign(new Error("Reservation not found or not in CONFIRMED status"), { status: 404 });
  return prisma.reservation.update({ where: { id: reservationId }, data: { status: "CHECKED_IN" } });
};
```

- [ ] **Step 2: Add controller handlers to portal.controller.ts**

Add at the end of `backend/src/modules/restaurant-portal/portal.controller.ts`:

```typescript
export const registerRestaurant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const restaurant = await portalService.registerRestaurant(req.user!.id, req.body);
    res.status(201).json(restaurant);
  } catch (err) { next(err); }
};

export const getAvailabilityForDate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slots = await portalService.getAvailabilityForDate(req.user!.id, req.params.date);
    res.json(slots);
  } catch (err) { next(err); }
};

export const setAvailabilityForDate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await portalService.setAvailabilityForDate(req.user!.id, req.params.date, req.body.slots);
    res.json(result);
  } catch (err) { next(err); }
};

export const getMyPromotions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const promotions = await portalService.getMyPromotions(req.user!.id);
    res.json(promotions);
  } catch (err) { next(err); }
};

export const createPromotion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const promo = await portalService.createPromotion(req.user!.id, req.body);
    res.status(201).json(promo);
  } catch (err) { next(err); }
};

export const updatePromotion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const promo = await portalService.updatePromotion(req.user!.id, req.params.id, req.body);
    res.json(promo);
  } catch (err) { next(err); }
};

export const deletePromotion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await portalService.deletePromotion(req.user!.id, req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
};

export const replyToReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reply } = req.body as { reply: string };
    if (!reply) return res.status(400).json({ error: "reply is required" });
    const result = await portalService.replyToReview(req.user!.id, req.params.id, reply);
    res.json(result);
  } catch (err) { next(err); }
};

export const getPortalAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const analytics = await portalService.getPortalAnalytics(req.user!.id);
    if (!analytics) return res.status(404).json({ error: "Restaurant not found" });
    res.json(analytics);
  } catch (err) { next(err); }
};

export const checkInReservation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reservation = await portalService.checkInReservation(req.user!.id, req.params.id);
    res.json(reservation);
  } catch (err) { next(err); }
};
```

- [ ] **Step 3: Replace portal.routes.ts with all routes**

```typescript
import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth.js";
import * as portalController from "./portal.controller.js";

const router = Router();

router.use(authenticate, requireRole("RESTAURANT_ADMIN"));

// Restaurant registration & profile
router.post("/restaurant", portalController.registerRestaurant);
router.get("/restaurant", portalController.getMyRestaurant);
router.patch("/restaurant", portalController.updateMyRestaurant);

// Dashboard
router.get("/stats", portalController.getMyStats);
router.get("/analytics", portalController.getPortalAnalytics);

// Reservations
router.get("/reservations", portalController.getMyReservations);
router.patch("/reservations/:id/status", portalController.updateReservationStatus);
router.patch("/reservations/:id/checkin", portalController.checkInReservation);

// Reviews
router.get("/reviews", portalController.getMyReviews);
router.post("/reviews/:id/reply", portalController.replyToReview);
router.put("/reviews/:id/reply", portalController.replyToReview);

// Payments
router.get("/payments", portalController.getMyPayments);
router.patch("/payments/:id/status", portalController.updatePaymentStatus);

// Menu
router.get("/menu", portalController.getMyMenu);
router.post("/menu", portalController.createMenuItem);
router.patch("/menu/:id", portalController.updateMenuItem);
router.delete("/menu/:id", portalController.deleteMenuItem);

// Availability
router.get("/availability/:date", portalController.getAvailabilityForDate);
router.put("/availability/:date", portalController.setAvailabilityForDate);

// Promotions
router.get("/promotions", portalController.getMyPromotions);
router.post("/promotions", portalController.createPromotion);
router.put("/promotions/:id", portalController.updatePromotion);
router.delete("/promotions/:id", portalController.deletePromotion);

export default router;
```

- [ ] **Step 4: Add missing imports to portal.service.ts**

At the top of `backend/src/modules/restaurant-portal/portal.service.ts`, ensure these imports exist:

```typescript
import { prisma } from "../../../lib/db.js";
import { adminFirestore } from "../../config/firebase.js";
import { createNotification } from "../../../lib/notifications.js";
```

- [ ] **Step 5: Commit**

```bash
cd /Users/gimhanrajapaksha/Desktop/projects/agent_project/restaurant-chatbot
git add backend/src/modules/restaurant-portal/
git commit -m "feat(portal): add availability management, promotions CRUD, review replies, analytics, check-in, restaurant registration"
```

---

### Task 8: Waitlist Module

**Files:**
- Create: `backend/src/modules/waitlist/waitlist.service.ts`
- Create: `backend/src/modules/waitlist/waitlist.controller.ts`
- Create: `backend/src/modules/waitlist/waitlist.routes.ts`
- Modify: `backend/src/app.ts`

**New endpoints:**
- `POST /api/waitlist` — join a waitlist
- `GET  /api/waitlist` — get my waitlist entries
- `DELETE /api/waitlist/:id` — leave waitlist
- `GET  /api/waitlist/restaurant/:restaurantId` — get position for a specific restaurant/date/time

- [ ] **Step 1: Create waitlist.service.ts**

Create `backend/src/modules/waitlist/waitlist.service.ts`:

```typescript
import { prisma } from "../../../lib/db.js";
import { createNotification } from "../../../lib/notifications.js";

interface JoinWaitlistInput {
  restaurantId: string;
  date: string;
  time: string;
  partySize: number;
}

export const joinWaitlist = async (userId: string, input: JoinWaitlistInput) => {
  const existing = await prisma.waitlist.findFirst({
    where: {
      userId,
      restaurantId: input.restaurantId,
      date: new Date(input.date),
      time: input.time,
      status: "WAITING",
    },
  });
  if (existing) throw Object.assign(new Error("Already on waitlist for this slot"), { status: 409 });

  const position = await prisma.waitlist.count({
    where: {
      restaurantId: input.restaurantId,
      date: new Date(input.date),
      time: input.time,
      status: "WAITING",
    },
  }) + 1;

  return prisma.waitlist.create({
    data: {
      userId,
      restaurantId: input.restaurantId,
      date: new Date(input.date),
      time: input.time,
      partySize: input.partySize,
      position,
    },
    include: { restaurant: { select: { name: true } } },
  });
};

export const getMyWaitlist = async (userId: string) => {
  return prisma.waitlist.findMany({
    where: { userId, status: { in: ["WAITING", "NOTIFIED"] } },
    include: { restaurant: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
};

export const leaveWaitlist = async (id: string, userId: string) => {
  const entry = await prisma.waitlist.findUnique({ where: { id } });
  if (!entry) throw Object.assign(new Error("Waitlist entry not found"), { status: 404 });
  if (entry.userId !== userId) throw Object.assign(new Error("Forbidden"), { status: 403 });
  if (!["WAITING", "NOTIFIED"].includes(entry.status)) {
    throw Object.assign(new Error("Cannot leave waitlist in current status"), { status: 400 });
  }
  await prisma.waitlist.update({ where: { id }, data: { status: "EXPIRED" } });
};

export const notifyWaitlistForSlot = async (restaurantId: string, date: string, time: string) => {
  const entries = await prisma.waitlist.findMany({
    where: { restaurantId, date: new Date(date), time, status: "WAITING" },
    include: { restaurant: { select: { name: true } } },
    orderBy: { position: "asc" },
    take: 3,
  });
  for (const entry of entries) {
    await prisma.waitlist.update({ where: { id: entry.id }, data: { status: "NOTIFIED", notifiedAt: new Date() } });
    await createNotification(
      entry.userId,
      "WAITLIST_AVAILABLE",
      "A table is now available!",
      `A slot opened up at ${entry.restaurant.name} on ${date} at ${time}. Book now before it fills up!`,
      { restaurantId, date, time },
    );
  }
  return entries.length;
};
```

- [ ] **Step 2: Create waitlist.controller.ts**

Create `backend/src/modules/waitlist/waitlist.controller.ts`:

```typescript
import type { Request, Response, NextFunction } from "express";
import * as waitlistService from "./waitlist.service.js";
import { z } from "zod";

const JoinSchema = z.object({
  restaurantId: z.string().uuid(),
  date: z.string(),
  time: z.string(),
  partySize: z.number().int().min(1).max(20),
});

export const joinWaitlist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = JoinSchema.parse(req.body);
    const entry = await waitlistService.joinWaitlist((req as any).user!.id, body);
    res.status(201).json(entry);
  } catch (err) { next(err); }
};

export const getMyWaitlist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entries = await waitlistService.getMyWaitlist((req as any).user!.id);
    res.json(entries);
  } catch (err) { next(err); }
};

export const leaveWaitlist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await waitlistService.leaveWaitlist(req.params.id, (req as any).user!.id);
    res.status(204).send();
  } catch (err) { next(err); }
};
```

- [ ] **Step 3: Create waitlist.routes.ts**

Create `backend/src/modules/waitlist/waitlist.routes.ts`:

```typescript
import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import * as waitlistController from "./waitlist.controller.js";

const router = Router();

router.use(authenticate);

router.post("/", waitlistController.joinWaitlist);
router.get("/", waitlistController.getMyWaitlist);
router.delete("/:id", waitlistController.leaveWaitlist);

export default router;
```

- [ ] **Step 4: Register in app.ts**

In `backend/src/app.ts`, add:

```typescript
import waitlistRoutes from "./modules/waitlist/waitlist.routes.js";
```

And add the route:

```typescript
app.use("/api/waitlist", waitlistRoutes);
```

- [ ] **Step 5: Wire waitlist notification into reservation cancellation**

In `backend/src/modules/reservation/reservation.service.ts`, inside `cancelReservation`, after the Firestore slot update, add:

```typescript
  // Notify waitlist when a slot opens
  import("../../waitlist/waitlist.service.js").then(({ notifyWaitlistForSlot }) => {
    const dateStr = reservation.date.toISOString().split("T")[0];
    notifyWaitlistForSlot(reservation.restaurantId, dateStr, reservation.time).catch(() => {});
  }).catch(() => {});
```

- [ ] **Step 6: Commit**

```bash
cd /Users/gimhanrajapaksha/Desktop/projects/agent_project/restaurant-chatbot
git add backend/src/modules/waitlist/ backend/src/app.ts backend/src/modules/reservation/reservation.service.ts
git commit -m "feat(waitlist): add waitlist join/leave with automatic slot-open notifications"
```

---

## PHASE C: Python AI Service Extensions

### Task 9: General / Info Agent

**Files:**
- Create: `ai-service/agents/general.py`
- Modify: `ai-service/graph/graph.py`
- Modify: `ai-service/knowledge/prompts.py`

**What this does:** Handles GENERAL intent — restaurant info questions, account questions, platform FAQs, greetings — so the orchestrator doesn't return an empty response.

- [ ] **Step 1: Add GENERAL_SYSTEM_PROMPT to prompts.py**

In `ai-service/knowledge/prompts.py`, add at the end:

```python
GENERAL_SYSTEM_PROMPT = """You are a helpful AI assistant for a restaurant discovery and reservation platform.

You help customers with:
- General questions about how the platform works
- Information about restaurant bookings, payments, and reservations
- Account-related questions (how to update profile, manage favorites, etc.)
- Greeting and casual conversation to guide them toward restaurant discovery or reservations

Platform capabilities you can describe:
- Search restaurants by cuisine, area, price range, or name
- Get personalized restaurant recommendations
- Make, modify, or cancel reservations
- Pre-order food and pay online via Stripe
- Save favorite restaurants and organize into collections
- View reservation history and dining insights

Keep responses concise, friendly, and helpful. If the user seems to want a recommendation or search, invite them to ask.
Always respond in the same language the user is writing in."""
```

- [ ] **Step 2: Create ai-service/agents/general.py**

```python
from langchain_google_vertexai import ChatVertexAI
from langchain_core.messages import SystemMessage, HumanMessage

from config.settings import settings
from knowledge.prompts import GENERAL_SYSTEM_PROMPT

llm = ChatVertexAI(
    model_name=settings.gemini_model,
    project=settings.vertex_project_id,
    location=settings.vertex_location,
    temperature=0.5,
)


def handle_general(state: dict) -> dict:
    messages = state["messages"]
    user_message = messages[-1].content

    history_lines = [
        f"{'User' if m.type == 'human' else 'Assistant'}: {m.content}"
        for m in messages[:-1][-6:]
    ]
    history_text = "\n".join(history_lines) if history_lines else "(no prior history)"

    response = llm.invoke([
        SystemMessage(content=GENERAL_SYSTEM_PROMPT),
        HumanMessage(content=f"Conversation history:\n{history_text}\n\nUser: {user_message}"),
    ])

    return {**state, "final_response": response.content}
```

- [ ] **Step 3: Update graph.py to route GENERAL to the general agent**

Replace the full contents of `ai-service/graph/graph.py`:

```python
from langgraph.graph import StateGraph, END

from graph.state import AgentState
from agents.orchestrator import orchestrate
from agents.discovery import search_restaurants
from agents.recommendation import recommend_restaurants
from agents.reservation import handle_reservation
from agents.payment import handle_payment
from agents.general import handle_general

_ROUTE_MAP = {
    "SEARCH": "discovery",
    "RECOMMEND": "recommendation",
    "RESERVE": "reservation",
    "PAYMENT": "payment",
    "GENERAL": "general",
}


def _route(state: AgentState) -> str:
    return _ROUTE_MAP.get(state.get("intent", "GENERAL"), "general")


def build_graph():
    g = StateGraph(AgentState)

    g.add_node("orchestrator", orchestrate)
    g.add_node("discovery", search_restaurants)
    g.add_node("recommendation", recommend_restaurants)
    g.add_node("reservation", handle_reservation)
    g.add_node("payment", handle_payment)
    g.add_node("general", handle_general)

    g.set_entry_point("orchestrator")

    g.add_conditional_edges(
        "orchestrator",
        _route,
        {
            "discovery": "discovery",
            "recommendation": "recommendation",
            "reservation": "reservation",
            "payment": "payment",
            "general": "general",
        },
    )

    for node in ("discovery", "recommendation", "reservation", "payment", "general"):
        g.add_edge(node, END)

    return g.compile()


agent_graph = build_graph()
```

- [ ] **Step 4: Commit**

```bash
cd /Users/gimhanrajapaksha/Desktop/projects/agent_project/restaurant-chatbot
git add ai-service/agents/general.py ai-service/graph/graph.py ai-service/knowledge/prompts.py
git commit -m "feat(ai): add general/info agent to handle GENERAL intent instead of silent END"
```

---

### Task 10: Cancel/Modify Reservation via Chat

**Files:**
- Modify: `ai-service/agents/reservation.py`

**What this does:** When the user says "cancel my booking" or "change my reservation", the agent currently just generates a text response. This task makes it actually call the backend API.

- [ ] **Step 1: Add cancel and modify API callers to reservation.py**

Add these two functions after `_call_backend_create_reservation` in `ai-service/agents/reservation.py`:

```python
async def _call_backend_cancel_reservation(reservation_id: str, auth_token: str) -> bool:
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.delete(
                f"{settings.backend_url}/api/reservations/{reservation_id}",
                headers={"Authorization": f"Bearer {auth_token}"},
            )
        return resp.status_code in (200, 204)
    except Exception as e:
        print(f"[reservation] cancel API error: {e}")
        return False


async def _find_reservation_id_by_booking_ref(messages: list, auth_token: str) -> Optional[str]:
    """Try to resolve a booking ref from the conversation into a reservation ID."""
    for m in messages:
        from langchain_core.messages import AIMessage as _AIMessage
        if isinstance(m, _AIMessage) and _BOOKING_MARKER in m.content:
            idx = m.content.index(_BOOKING_MARKER) + len(_BOOKING_MARKER)
            return m.content[idx:].strip().split()[0].rstrip(".")
    # Fallback: fetch latest reservation from backend
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{settings.backend_url}/api/reservations",
                headers={"Authorization": f"Bearer {auth_token}"},
            )
        if resp.status_code == 200:
            reservations = resp.json()
            active = [r for r in reservations if r.get("status") in ("PENDING", "CONFIRMED")]
            return active[0]["id"] if active else None
    except Exception:
        pass
    return None


async def _call_backend_modify_reservation(
    reservation_id: str,
    updates: dict,
    auth_token: str,
) -> Optional[dict]:
    payload = {}
    if updates.get("date"): payload["date"] = updates["date"]
    if updates.get("time"): payload["time"] = updates["time"]
    if updates.get("party_size"): payload["partySize"] = int(updates["party_size"])
    if updates.get("special_requests"): payload["specialRequests"] = updates["special_requests"]
    if not payload:
        return None
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.put(
                f"{settings.backend_url}/api/reservations/{reservation_id}",
                json=payload,
                headers={"Authorization": f"Bearer {auth_token}"},
            )
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"[reservation] modify API error: {e}")
    return None
```

- [ ] **Step 2: Update handle_reservation to execute cancel/modify**

In the `handle_reservation` function, after the existing `booking_result = None` block and before the final LLM call, add this cancel/modify execution block. Replace the section starting with `if (details.get("action") == "BOOK"` through the end of the condition block:

```python
    if (
        details.get("action") == "BOOK"
        and _all_details_present(details)
        and not existing_ref
        and auth_token
    ):
        booking_result = await _call_backend_create_reservation(details, auth_token)
        if booking_result:
            context["booking_ref"] = booking_result.get("id")
            context["booking_confirmed"] = True
    elif details.get("action") == "CANCEL" and auth_token:
        reservation_id = await _find_reservation_id_by_booking_ref(messages, auth_token)
        if reservation_id:
            success = await _call_backend_cancel_reservation(reservation_id, auth_token)
            context["cancel_success"] = success
            context["cancelled_reservation_id"] = reservation_id if success else None
    elif details.get("action") == "MODIFY" and auth_token:
        reservation_id = await _find_reservation_id_by_booking_ref(messages, auth_token)
        if reservation_id:
            modify_result = await _call_backend_modify_reservation(reservation_id, details, auth_token)
            context["modify_success"] = modify_result is not None
            context["modified_reservation"] = modify_result
    elif not auth_token and details.get("action") in ("BOOK", "CANCEL", "MODIFY"):
        context["auth_required"] = True
```

Update the system prompt section to handle cancel/modify outcomes:

```python
    system_prompt = RESERVATION_SYSTEM_PROMPT
    if booking_result:
        system_prompt += (
            f"\n\nThe reservation has been successfully created. "
            f"Include exactly this line: \"{_BOOKING_MARKER} {booking_result.get('id')}\"\n"
            f"After confirming, invite the user to pre-order from the menu."
        )
    elif context.get("cancel_success"):
        system_prompt += "\n\nThe reservation has been successfully cancelled. Confirm this warmly."
    elif details.get("action") == "CANCEL" and not context.get("cancel_success"):
        system_prompt += "\n\nCould not cancel the reservation. Ask the user to contact support or check if they have an active booking."
    elif context.get("modify_success"):
        system_prompt += "\n\nThe reservation has been successfully modified. Confirm the changes."
    elif context.get("auth_required"):
        system_prompt += "\n\nThe user needs to be logged in to perform this action. Ask them to sign in."
```

- [ ] **Step 3: Commit**

```bash
cd /Users/gimhanrajapaksha/Desktop/projects/agent_project/restaurant-chatbot
git add ai-service/agents/reservation.py
git commit -m "feat(ai): reservation agent now calls backend API for cancel and modify actions"
```

---

### Task 11: Post-Booking Neo4j Preference Update

**Files:**
- Modify: `ai-service/agents/reservation.py`

**What this does:** After a booking is confirmed, update the user's cuisine preferences in Neo4j so future recommendations improve.

- [ ] **Step 1: Add preference update call after successful booking**

In `ai-service/agents/reservation.py`, import Neo4j tools at the top:

```python
from tools.neo4j_tools import record_visit, update_user_preference
```

In `handle_reservation`, after `if booking_result:`, add:

```python
        if booking_result:
            context["booking_ref"] = booking_result.get("id")
            context["booking_confirmed"] = True
            # Update Neo4j preference graph with the restaurant visited
            try:
                restaurant_info = await lookup_restaurant_by_name(details.get("restaurant_name", ""))
                if restaurant_info and user_id:
                    # Get cuisine type from DB
                    async with httpx.AsyncClient(timeout=10) as client:
                        menu_resp = await client.get(
                            f"{settings.backend_url}/api/restaurants/{restaurant_info['id']}",
                        )
                    if menu_resp.status_code == 200:
                        r_data = menu_resp.json()
                        cuisines = r_data.get("cuisineTypes", [])
                        if cuisines:
                            record_visit(user_id, restaurant_info["id"], restaurant_info["name"], cuisines[0])
                        else:
                            update_user_preference(user_id, "General", 0.1)
            except Exception as neo_err:
                print(f"[reservation] Neo4j update failed (non-fatal): {neo_err}")
```

- [ ] **Step 2: Commit**

```bash
cd /Users/gimhanrajapaksha/Desktop/projects/agent_project/restaurant-chatbot
git add ai-service/agents/reservation.py
git commit -m "feat(ai): update Neo4j preference graph after successful booking"
```

---

### Task 12: Guest Message Limit Enforcement

**Files:**
- Modify: `ai-service/main.py`
- Modify: `ai-service/schemas/models.py`

**What this does:** Guest users (no user_id / empty user_id) are limited to 3 messages. The AI service enforces this by counting the history length and rejecting once the limit is reached.

- [ ] **Step 1: Update schemas/models.py to expose guest_message_count**

In `ai-service/schemas/models.py`, read the current content first, then add to `ChatResponse`:

```python
from pydantic import BaseModel
from typing import Optional, Any

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    user_id: Optional[str] = None
    session_id: str
    message: str
    history: list[Message] = []

class ChatResponse(BaseModel):
    session_id: str
    message: str
    intent: Optional[str] = None
    data: Optional[Any] = None
    guest_limit_reached: bool = False

class EmbedRequest(BaseModel):
    name: str
    description: Optional[str] = None
    cuisine_types: list[str] = []
    area: str
```

- [ ] **Step 2: Add guest limit check in main.py**

In `ai-service/main.py`, update the `/chat` endpoint to add guest limit check before invoking the graph:

```python
GUEST_MESSAGE_LIMIT = 3

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, authorization: str = Header(default=None)):
    try:
        is_guest = not request.user_id or request.user_id.strip() == ""

        # Enforce guest message limit
        if is_guest:
            guest_message_count = len([m for m in request.history if m.role == "user"]) + 1
            if guest_message_count > GUEST_MESSAGE_LIMIT:
                return ChatResponse(
                    session_id=request.session_id,
                    message="You've reached the free message limit. Please sign in or create an account to continue chatting.",
                    intent="AUTH_REQUIRED",
                    guest_limit_reached=True,
                )

        history = [
            HumanMessage(content=m.content) if m.role == "user"
            else AIMessage(content=m.content)
            for m in request.history
        ]
        history.append(HumanMessage(content=request.message))

        auth_token = None
        if authorization and authorization.startswith("Bearer "):
            auth_token = authorization.split("Bearer ", 1)[1]

        user_id = request.user_id if not is_guest else f"guest_{request.session_id}"

        result = await agent_graph.ainvoke({
            "user_id": user_id,
            "session_id": request.session_id,
            "messages": history,
            "intent": None,
            "current_agent": None,
            "search_results": None,
            "recommendation_results": None,
            "reservation_details": None,
            "payment_details": None,
            "final_response": None,
            "error": None,
            "auth_token": auth_token,
        })

        return ChatResponse(
            session_id=request.session_id,
            message=result.get("final_response") or "I couldn't process that request. Please try again.",
            intent=result.get("intent"),
            data=result.get("search_results") or result.get("recommendation_results"),
            guest_limit_reached=False,
        )
    except Exception as e:
        logger.error("Chat handler error: %s", str(e))
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
```

- [ ] **Step 3: Commit**

```bash
cd /Users/gimhanrajapaksha/Desktop/projects/agent_project/restaurant-chatbot
git add ai-service/main.py ai-service/schemas/models.py
git commit -m "feat(ai): enforce 3-message limit for guest users; add guest_limit_reached in response"
```

---

## Final Verification

After all tasks are complete, verify the backends start cleanly:

- [ ] **Verify Express starts**

```bash
cd /Users/gimhanrajapaksha/Desktop/projects/agent_project/restaurant-chatbot/backend
npm run dev
```

Expected: Server running on port without import or type errors.

- [ ] **Verify Python AI service starts**

```bash
cd /Users/gimhanrajapaksha/Desktop/projects/agent_project/restaurant-chatbot/ai-service
source .venv/bin/activate && uvicorn main:app --reload --port 8000
```

Expected: Application startup complete.

- [ ] **Smoke-test key endpoints**

```bash
# Check backend health
curl http://localhost:3000/health

# Check AI service health  
curl http://localhost:8000/health
```

Expected: Both return `{"status": "ok"}`.

---

## API Surface Summary (for frontend reference)

### Customer APIs
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/restaurants | Public | List with cuisine/area/rating/search filters; returns `{data, total, page, limit}` |
| GET | /api/restaurants/:id | Public | Restaurant detail |
| GET | /api/restaurants/:id/reviews | Public | Paginated reviews with replies |
| GET | /api/restaurants/:id/menu | Public | Menu items |
| GET | /api/restaurants/:id/availability | Public | Availability slots for a date |
| GET | /api/restaurants/:id/promotions | Public | Active promotions |
| GET | /api/users/me | Customer | Profile |
| PUT | /api/users/me | Customer | Update profile |
| DELETE | /api/users/me | Customer | Delete account |
| GET | /api/users/me/preferences | Customer | Dining preferences |
| PUT | /api/users/me/preferences | Customer | Update dining preferences |
| GET | /api/users/me/favorites | Customer | List favorites (`?collection=`) |
| POST | /api/users/me/favorites | Customer | Add favorite `{restaurantId, collection}` |
| DELETE | /api/users/me/favorites/:restaurantId | Customer | Remove favorite |
| GET | /api/users/me/favorites/:restaurantId/check | Customer | Check if favorited |
| GET | /api/users/me/reviews | Customer | My reviews |
| GET | /api/users/me/notifications | Customer | Notifications (paged) |
| PATCH | /api/users/me/notifications/:id/read | Customer | Mark notification read |
| PATCH | /api/users/me/notifications/read-all | Customer | Mark all read |
| GET | /api/users/me/insights | Customer | Dining analytics |
| GET | /api/reservations | Customer | List my reservations |
| GET | /api/reservations/:id | Customer | Get reservation |
| POST | /api/reservations | Customer | Create reservation |
| PUT | /api/reservations/:id | Customer | Modify reservation |
| DELETE | /api/reservations/:id | Customer | Cancel reservation |
| GET | /api/reservations/:id/review | Customer | Get review for reservation |
| POST | /api/reservations/:id/review | Customer | Submit review (status must be COMPLETED) |
| PUT | /api/reservations/:id/review | Customer | Update review |
| DELETE | /api/reservations/:id/review | Customer | Delete review |
| POST | /api/payments/checkout | Customer | Create checkout session |
| GET | /api/payments/history | Customer | Payment history |
| POST | /api/waitlist | Customer | Join waitlist |
| GET | /api/waitlist | Customer | My waitlist entries |
| DELETE | /api/waitlist/:id | Customer | Leave waitlist |
| POST | /api/chat | Customer | Send chat message |
| GET | /api/chat/history | Customer | Chat history |

### Restaurant Portal APIs
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/restaurant-portal/restaurant | RESTAURANT_ADMIN | Register restaurant |
| GET | /api/restaurant-portal/restaurant | RESTAURANT_ADMIN | Get my restaurant |
| PATCH | /api/restaurant-portal/restaurant | RESTAURANT_ADMIN | Update restaurant info |
| GET | /api/restaurant-portal/stats | RESTAURANT_ADMIN | Dashboard stats |
| GET | /api/restaurant-portal/analytics | RESTAURANT_ADMIN | Detailed analytics |
| GET | /api/restaurant-portal/reservations | RESTAURANT_ADMIN | List reservations |
| PATCH | /api/restaurant-portal/reservations/:id/status | RESTAURANT_ADMIN | Update status |
| PATCH | /api/restaurant-portal/reservations/:id/checkin | RESTAURANT_ADMIN | Check in guest |
| GET | /api/restaurant-portal/reviews | RESTAURANT_ADMIN | List reviews |
| POST | /api/restaurant-portal/reviews/:id/reply | RESTAURANT_ADMIN | Reply to review |
| PUT | /api/restaurant-portal/reviews/:id/reply | RESTAURANT_ADMIN | Update reply |
| GET | /api/restaurant-portal/payments | RESTAURANT_ADMIN | Payments |
| GET | /api/restaurant-portal/menu | RESTAURANT_ADMIN | Menu items |
| POST | /api/restaurant-portal/menu | RESTAURANT_ADMIN | Add menu item |
| PATCH | /api/restaurant-portal/menu/:id | RESTAURANT_ADMIN | Update menu item |
| DELETE | /api/restaurant-portal/menu/:id | RESTAURANT_ADMIN | Delete menu item |
| GET | /api/restaurant-portal/availability/:date | RESTAURANT_ADMIN | Get availability |
| PUT | /api/restaurant-portal/availability/:date | RESTAURANT_ADMIN | Set availability `{slots: [{time, totalTables, bookedTables, available}]}` |
| GET | /api/restaurant-portal/promotions | RESTAURANT_ADMIN | List promotions |
| POST | /api/restaurant-portal/promotions | RESTAURANT_ADMIN | Create promotion |
| PUT | /api/restaurant-portal/promotions/:id | RESTAURANT_ADMIN | Update promotion |
| DELETE | /api/restaurant-portal/promotions/:id | RESTAURANT_ADMIN | Delete promotion |

### Admin APIs
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/admin/stats | SYSTEM_ADMIN | Dashboard stats |
| GET | /api/admin/restaurants | SYSTEM_ADMIN | List restaurants |
| GET | /api/admin/restaurants/:id | SYSTEM_ADMIN | Restaurant detail |
| POST | /api/admin/restaurants/:id/verify | SYSTEM_ADMIN | Verify restaurant |
| PATCH | /api/admin/restaurants/:id/active | SYSTEM_ADMIN | Toggle active |
| GET | /api/admin/users | SYSTEM_ADMIN | List users |
| GET | /api/admin/users/:id | SYSTEM_ADMIN | User detail |
| PATCH | /api/admin/users/:id/role | SYSTEM_ADMIN | Update role |
| PATCH | /api/admin/users/:id/suspend | SYSTEM_ADMIN | Suspend user |
| PATCH | /api/admin/users/:id/activate | SYSTEM_ADMIN | Activate user |
| GET | /api/admin/reservations | SYSTEM_ADMIN | All reservations |
| GET | /api/admin/payments | SYSTEM_ADMIN | All payments |
| GET | /api/admin/payments/summary | SYSTEM_ADMIN | Payment summary |
| POST | /api/admin/payments/:id/refund | SYSTEM_ADMIN | Issue refund |
| GET | /api/admin/reviews | SYSTEM_ADMIN | All reviews |
| PATCH | /api/admin/reviews/:id/hide | SYSTEM_ADMIN | Hide review |
| DELETE | /api/admin/reviews/:id | SYSTEM_ADMIN | Delete review |
| POST | /api/admin/notifications | SYSTEM_ADMIN | Broadcast announcement |
| GET | /api/admin/analytics/reservations | SYSTEM_ADMIN | 30-day reservation trend |
| GET | /api/admin/analytics/revenue | SYSTEM_ADMIN | 30-day revenue trend |
| GET | /api/admin/analytics/cuisines | SYSTEM_ADMIN | Top cuisines |
| GET | /api/admin/analytics/users | SYSTEM_ADMIN | 30-day user growth |
| GET | /api/admin/analytics/reservation-status | SYSTEM_ADMIN | Status breakdown |
| GET | /api/admin/settings | SYSTEM_ADMIN | System settings |
| PATCH | /api/admin/settings | SYSTEM_ADMIN | Update settings |
| GET | /api/admin/logs | SYSTEM_ADMIN | Audit logs |

### AI Chat API
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /chat | None | Chat `{user_id?, session_id, message, history}` → `{session_id, message, intent, data, guest_limit_reached}` |
| POST | /embed/restaurant/:id | None | Embed restaurant for search |
