# Mobile Stripe Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix a payment-forgery hole in the backend's PaymentIntent endpoint, then build a full mobile booking flow (date/time/party → menu/cart → review & pay) ending in a native Stripe Payment Sheet, replacing the "Book a table" button's placeholder snackbar.

**Architecture:** Backend: extract the existing (checkout-session-only) server-side price verification into a shared pure function, use it from both payment paths. Mobile: new `lib/features/booking/` module (models → repository → step widgets → flow screen) following the existing repository/provider layering, plus the platform-level Android changes `flutter_stripe` requires.

**Tech Stack:** Express/Prisma/Zod/vitest (backend), Flutter/Dart, `flutter_stripe: ^13.1.0`, `provider`, `go_router` (mobile).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-25-mobile-stripe-booking-design.md` — read it if anything below is unclear.
- **Backend has real tests (vitest, `backend/src/tests/`)** — unlike mobile, add a test for the pricing fix (mirrors the existing `loyalty.test.ts` style: extract pure logic, test it directly, no DB mocking).
- **Mobile still has zero tests** and the user said "no tests needed" earlier this session — verify mobile tasks with `flutter analyze` plus, for the Android-platform task specifically, a real `flutter build apk --debug` (analyze alone won't catch native Kotlin/theme misconfiguration). Final task is manual on-device verification — per established preference this session, do not drive `flutter run`/`adb` yourself; hand off to the user with exact steps.
- `flutter_stripe: ^13.1.0` is already present in `mobile/pubspec.yaml` (added during planning to inspect its API) — later tasks should treat it as already there, not re-add it.
- Money-handling code: never trust a client-supplied amount. The whole point of Task 1 is that the server recomputes the total from `orderItems` looked up in the DB — every later task must call the fixed endpoint with `orderItems`, never a raw `amount`.
- Colors/styling in new mobile widgets: use `AppColors` constants (`mobile/lib/core/theme/app_colors.dart`), matching every other feature.
- Restaurant navigation elsewhere in this app uses `context.push(...)`, not `context.go(...)` — keep that convention for `/restaurants/:id/book` too.

---

### Task 1: Fix `createPaymentIntent` payment-forgery hole (backend)

**Files:**
- Modify: `backend/src/modules/payment/payment.schema.ts`
- Modify: `backend/src/modules/payment/payment.service.ts`
- Modify: `backend/src/modules/payment/payment.controller.ts`
- Create: `backend/src/tests/payment-pricing.test.ts`

**Interfaces:**
- Consumes: `OrderItemSchema` (already exists in `payment.schema.ts`), `prisma.menuItem`, `prisma.payment` (existing Prisma models).
- Produces: pure function `computeVerifiedTotal(orderItems: OrderItemInput[], dbPriceMap: Map<string, number>): { verifiedItems: OrderItemInput[]; subtotal: number; serviceCharge: number; total: number }`; async wrapper `verifyOrderAndComputeTotal(orderItems: OrderItemInput[]): Promise<{ verifiedItems: OrderItemInput[]; subtotal: number; serviceCharge: number; total: number }>`; `createPaymentIntent(reservationId: string, userId: string, userEmail: string, orderItems: OrderItemInput[]): Promise<{ clientSecret: string; paymentId: string; amount: number }>`.

- [ ] **Step 1: Write the pricing test**

Create `backend/src/tests/payment-pricing.test.ts`:

```ts
import { describe, it, expect } from "vitest";

// Pure logic: order verification + total computation, extracted from payment.service.ts
const SERVICE_CHARGE_RATE = 0.10;

interface OrderItemInput {
  menuItemId?: string | null;
  name: string;
  price: number;
  quantity: number;
  category?: string;
}

const computeVerifiedTotal = (
  orderItems: OrderItemInput[],
  dbPriceMap: Map<string, number>,
) => {
  const verifiedItems = orderItems.map((item) => {
    if (!item.menuItemId) return item;
    const dbPrice = dbPriceMap.get(item.menuItemId);
    if (dbPrice === undefined) {
      throw Object.assign(
        new Error(`Menu item ${item.menuItemId} not found or unavailable`),
        { status: 400 },
      );
    }
    return { ...item, price: dbPrice };
  });

  const subtotal = verifiedItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const serviceCharge = Math.round(subtotal * SERVICE_CHARGE_RATE);
  return { verifiedItems, subtotal, serviceCharge, total: subtotal + serviceCharge };
};

describe("computeVerifiedTotal (payment pricing)", () => {
  it("ignores a forged client price for an identified menu item and uses the DB price instead", () => {
    const dbPriceMap = new Map([["item-1", 1000]]);
    const result = computeVerifiedTotal(
      [{ menuItemId: "item-1", name: "Burger", price: 1, quantity: 2 }],
      dbPriceMap,
    );
    expect(result.verifiedItems[0].price).toBe(1000);
    expect(result.subtotal).toBe(2000);
  });

  it("computes a 10% service charge, rounded", () => {
    const dbPriceMap = new Map([["item-1", 999]]);
    const result = computeVerifiedTotal(
      [{ menuItemId: "item-1", name: "Burger", price: 999, quantity: 1 }],
      dbPriceMap,
    );
    expect(result.serviceCharge).toBe(100); // round(99.9) = 100
    expect(result.total).toBe(1099);
  });

  it("keeps the client-supplied price for an item with no menuItemId", () => {
    const result = computeVerifiedTotal(
      [{ name: "Custom request", price: 500, quantity: 1 }],
      new Map(),
    );
    expect(result.verifiedItems[0].price).toBe(500);
  });

  it("throws when a menuItemId isn't in the DB price map", () => {
    expect(() =>
      computeVerifiedTotal(
        [{ menuItemId: "missing", name: "Ghost item", price: 1, quantity: 1 }],
        new Map(),
      ),
    ).toThrow("Menu item missing not found or unavailable");
  });
});
```

- [ ] **Step 2: Run the test to see it pass against the extracted copy**

Run: `cd backend && npx vitest run src/tests/payment-pricing.test.ts`
Expected: PASS (4 tests) — this proves the logic itself is correct before wiring it into the real service.

- [ ] **Step 3: Extract the shared helper and rewrite `createPaymentIntent` in `payment.service.ts`**

Replace the price-verification block currently inlined in `createCheckoutSession`
(the `menuItemIds` / `dbItems` / `dbPriceMap` / `verifiedItems` / `subtotal` /
`serviceCharge` lines) and add these two functions above `createCheckoutSession`:

```ts
interface VerifiedOrder {
  verifiedItems: OrderItemInput[];
  subtotal: number;
  serviceCharge: number;
  total: number;
}

const computeVerifiedTotal = (
  orderItems: OrderItemInput[],
  dbPriceMap: Map<string, number>,
): VerifiedOrder => {
  const verifiedItems = orderItems.map((item) => {
    if (!item.menuItemId) return item;
    const dbPrice = dbPriceMap.get(item.menuItemId);
    if (dbPrice === undefined) {
      throw Object.assign(
        new Error(`Menu item ${item.menuItemId} not found or unavailable`),
        { status: 400 },
      );
    }
    return { ...item, price: dbPrice };
  });

  const subtotal = verifiedItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const serviceCharge = Math.round(subtotal * SERVICE_CHARGE_RATE);
  return { verifiedItems, subtotal, serviceCharge, total: subtotal + serviceCharge };
};

const verifyOrderAndComputeTotal = async (
  orderItems: OrderItemInput[],
): Promise<VerifiedOrder> => {
  const menuItemIds = orderItems
    .filter((i) => i.menuItemId)
    .map((i) => i.menuItemId as string);

  const dbItems = menuItemIds.length
    ? await prisma.menuItem.findMany({ where: { id: { in: menuItemIds }, isAvailable: true } })
    : [];
  const dbPriceMap = new Map(dbItems.map((m) => [m.id, m.price]));

  return computeVerifiedTotal(orderItems, dbPriceMap);
};
```

Update `createCheckoutSession` to call `verifyOrderAndComputeTotal(orderItems)` and
destructure `{ verifiedItems, total }` instead of its old inlined block (leave the
rest of `createCheckoutSession` — the Stripe session creation, the `Payment` row
creation — unchanged).

Replace the existing `createPaymentIntent` function entirely with:

```ts
export const createPaymentIntent = async (
  reservationId: string,
  userId: string,
  userEmail: string,
  orderItems: OrderItemInput[],
): Promise<{ clientSecret: string; paymentId: string; amount: number }> => {
  const { verifiedItems, total } = await verifyOrderAndComputeTotal(orderItems);

  const intent = await stripe.paymentIntents.create({
    amount: Math.round(total * 100),
    currency: "lkr",
    metadata: { reservationId, userId },
    receipt_email: userEmail,
  });

  const payment = await prisma.payment.upsert({
    where: { reservationId },
    create: {
      reservationId,
      userId,
      amount: total,
      currency: "LKR",
      stripePaymentId: intent.id,
      status: "PENDING",
      orderItems: verifiedItems as object[],
    },
    update: {
      amount: total,
      stripePaymentId: intent.id,
      status: "PENDING",
      orderItems: verifiedItems as object[],
    },
  });

  return { clientSecret: intent.client_secret!, paymentId: payment.id, amount: total };
};
```

(`upsert` on `reservationId` — not `create` — so retrying payment after a decline
doesn't crash on the `Payment.reservationId` unique constraint.)

- [ ] **Step 4: Update the schema in `payment.schema.ts`**

Replace:
```ts
export const CreatePaymentIntentBodySchema = z
  .object({
    reservationId: z.string().uuid(),
    amount: z.number().positive(),
  })
  .openapi("CreatePaymentIntentBody");
```
with:
```ts
export const CreatePaymentIntentBodySchema = z
  .object({
    reservationId: z.string().uuid(),
    orderItems: z.array(OrderItemSchema).min(1),
  })
  .openapi("CreatePaymentIntentBody");
```
(Move this schema definition below `OrderItemSchema`'s declaration if it isn't
already — `OrderItemSchema` must be defined before it's referenced here.)

Replace:
```ts
const PaymentIntentResponseSchema = z
  .object({
    clientSecret: z.string(),
  })
  .openapi("PaymentIntentResponse");
```
with:
```ts
const PaymentIntentResponseSchema = z
  .object({
    clientSecret: z.string(),
    paymentId: z.string().uuid(),
    amount: z.number(),
  })
  .openapi("PaymentIntentResponse");
```

- [ ] **Step 5: Update `payment.controller.ts`**

Replace the existing `createPaymentIntent` controller with:

```ts
export const createPaymentIntent = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const { reservationId, orderItems } = req.body as {
    reservationId: string;
    orderItems: paymentService.OrderItemInput[];
  };
  const result = await paymentService.createPaymentIntent(
    reservationId,
    req.user!.dbId,
    req.user!.email,
    orderItems,
  );
  res.json(result);
};
```

- [ ] **Step 6: Typecheck and run all backend tests**

Run: `cd backend && npm run build`
Expected: no TypeScript errors.

Run: `cd backend && npm test`
Expected: all tests pass, including the 4 new ones and the existing `loyalty.test.ts`.

- [ ] **Step 7: Commit**

```bash
cd backend
git add src/modules/payment/payment.schema.ts src/modules/payment/payment.service.ts src/modules/payment/payment.controller.ts src/tests/payment-pricing.test.ts
git commit -m "fix(security): recompute PaymentIntent total server-side instead of trusting client amount"
```

---

### Task 2: `flutter_stripe` Android platform setup

**Files:**
- Modify: `mobile/android/app/src/main/kotlin/com/restaurantchatbot/restaurant_chatbot_mobile/MainActivity.kt`
- Modify: `mobile/android/app/src/main/res/values/styles.xml`
- Modify: `mobile/android/app/src/main/res/values-night/styles.xml`
- Modify: `mobile/android/app/build.gradle.kts`

**Interfaces:**
- Consumes: nothing new.
- Produces: an Android build that can host `flutter_stripe`'s Payment Sheet (AppCompat theme + `FlutterFragmentActivity`). No Dart-visible API — purely platform config other tasks depend on to not crash at runtime.

`flutter_stripe`'s own README requirements (`~/.pub-cache/hosted/pub.dev/flutter_stripe-13.1.0/README.md`) call for: Android API 21+ (already 24 here), Kotlin 1.8+ (already 2.2.20), AGP 8+ (already 8.11.1), an AppCompat-descendant activity theme, and `FlutterFragmentActivity` instead of `FlutterActivity`. Only the theme and activity class need changes in this project.

- [ ] **Step 1: Switch `MainActivity` to `FlutterFragmentActivity`**

Replace the contents of
`mobile/android/app/src/main/kotlin/com/restaurantchatbot/restaurant_chatbot_mobile/MainActivity.kt`:

```kotlin
package com.restaurantchatbot.restaurant_chatbot_mobile

import io.flutter.embedding.android.FlutterFragmentActivity

class MainActivity : FlutterFragmentActivity()
```

- [ ] **Step 2: Add the AppCompat dependency**

In `mobile/android/app/build.gradle.kts`, add a `dependencies` block after the
`flutter { source = "../.." }` block (or anywhere top-level in the file):

```kotlin
dependencies {
    implementation("androidx.appcompat:appcompat:1.7.0")
}
```

- [ ] **Step 3: Change both themes to descend from `Theme.AppCompat`**

In `mobile/android/app/src/main/res/values/styles.xml`, change both `parent`
attributes from `@android:style/Theme.Light.NoTitleBar` to
`Theme.AppCompat.Light.NoActionBar`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="LaunchTheme" parent="Theme.AppCompat.Light.NoActionBar">
        <item name="android:windowBackground">@drawable/launch_background</item>
    </style>
    <style name="NormalTheme" parent="Theme.AppCompat.Light.NoActionBar">
        <item name="android:windowBackground">?android:colorBackground</item>
    </style>
</resources>
```

In `mobile/android/app/src/main/res/values-night/styles.xml`, change both
`parent` attributes from `@android:style/Theme.Black.NoTitleBar` to
`Theme.AppCompat.NoActionBar`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="LaunchTheme" parent="Theme.AppCompat.NoActionBar">
        <item name="android:windowBackground">@drawable/launch_background</item>
    </style>
    <style name="NormalTheme" parent="Theme.AppCompat.NoActionBar">
        <item name="android:windowBackground">?android:colorBackground</item>
    </style>
</resources>
```

- [ ] **Step 4: Real build (not just analyze) to catch native/theme misconfiguration**

Run: `cd mobile && flutter analyze`
Expected: no new issues (only the pre-existing `app_router.dart:1:8` unused-import warning).

Run: `cd mobile && flutter build apk --debug`
Expected: `✓ Built build/app/outputs/flutter-apk/app-debug.apk`. If this fails with a
resource-linking or theme error, re-check Step 3's exact style names against
whatever AppCompat version Gradle actually resolved (run `cd android && ./gradlew
:app:dependencies | grep appcompat` to see the resolved version if needed).

- [ ] **Step 5: Commit**

```bash
cd mobile
git add android/app/src/main/kotlin/com/restaurantchatbot/restaurant_chatbot_mobile/MainActivity.kt android/app/src/main/res/values/styles.xml android/app/src/main/res/values-night/styles.xml android/app/build.gradle.kts pubspec.yaml pubspec.lock
git commit -m "chore(mobile): add flutter_stripe and required Android platform setup"
```

---

### Task 3: Stripe SDK initialization

**Files:**
- Create: `mobile/lib/core/payments/stripe_config.dart`
- Modify: `mobile/lib/main.dart`

**Interfaces:**
- Produces: `class StripeConfig { static const String publishableKey; }`; `Stripe.publishableKey` set and `Stripe.instance.applySettings()` awaited before `runApp` in `main()`.

- [ ] **Step 1: Write the config file**

```dart
/// Stripe publishable key — safe to embed client-side (unlike the secret key).
/// Same test-mode key already used by backend/.env (STRIPE_PUBLIC_KEY) and
/// frontend/.env (NEXT_PUBLIC_STRIPE_PUBLIC_KEY).
class StripeConfig {
  StripeConfig._();

  static const String publishableKey =
      'pk_test_51Tb9sNKVKJmvD2D7TrDNBGE51vNzY48ZuubhutJ4yRtpU8xxMEB31os9AmEijSjapLijeB0paLsJGABmMfq30Ai200rboAnSiZ';
}
```

- [ ] **Step 2: Initialize it in `main.dart`**

Add the import near the other `core/` imports:

```dart
import 'package:flutter_stripe/flutter_stripe.dart';
import 'core/payments/stripe_config.dart';
```

In `main()`, after the existing `GoogleSignIn.instance.initialize(...)` call and
before `runApp(const RestaurantChatbotApp());`, add:

```dart
  Stripe.publishableKey = StripeConfig.publishableKey;
  await Stripe.instance.applySettings();
```

- [ ] **Step 3: Verify**

Run: `cd mobile && flutter analyze`
Expected: no new issues.

- [ ] **Step 4: Commit**

```bash
cd mobile
git add lib/core/payments/stripe_config.dart lib/main.dart
git commit -m "feat(mobile): initialize Stripe SDK at app startup"
```

---

### Task 4: `RestaurantModel.totalSeats`

**Files:**
- Modify: `mobile/lib/features/restaurants/models/restaurant_model.dart`

**Interfaces:**
- Produces: `RestaurantModel.totalSeats` (`int?`), parsed from the REST response's already-present `totalSeats` field (backend's `Restaurant` Prisma model has it; `parseRestaurant()` spreads the full row through, so it's already in the JSON — mobile's model just never declared it).

- [ ] **Step 1: Add the field**

In the class body, add after `final int totalReviews;`:
```dart
  final int? totalSeats;
```

In the constructor, add `this.totalSeats,` alongside the other optional named
params.

In `fromJson`, add:
```dart
      totalSeats: json['totalSeats'] as int?,
```

- [ ] **Step 2: Verify**

Run: `cd mobile && flutter analyze`
Expected: no new issues.

- [ ] **Step 3: Commit**

```bash
cd mobile
git add lib/features/restaurants/models/restaurant_model.dart
git commit -m "feat(mobile): parse totalSeats on RestaurantModel"
```

---

### Task 5: Booking models

**Files:**
- Create: `mobile/lib/features/booking/models/slot_model.dart`
- Create: `mobile/lib/features/booking/models/reservation_model.dart`
- Create: `mobile/lib/features/booking/models/cart_item_model.dart`

**Interfaces:**
- Produces: `class SlotModel { time, available, totalTables, bookedTables }` + `fromJson`; `class ReservationModel { id, restaurantId, date, time, partySize, status }` + `fromJson`; `class CartItemModel { menuItemId, name, price, quantity, category }` + `toOrderItemJson()`.

- [ ] **Step 1: Write `slot_model.dart`**

```dart
class SlotModel {
  final String time;
  final bool available;
  final int totalTables;
  final int bookedTables;

  const SlotModel({
    required this.time,
    required this.available,
    required this.totalTables,
    required this.bookedTables,
  });

  factory SlotModel.fromJson(Map<String, dynamic> json) {
    return SlotModel(
      time: json['time'] as String,
      available: json['available'] as bool? ?? true,
      totalTables: json['totalTables'] as int? ?? 0,
      bookedTables: json['bookedTables'] as int? ?? 0,
    );
  }
}
```

- [ ] **Step 2: Write `reservation_model.dart`**

```dart
class ReservationModel {
  final String id;
  final String restaurantId;
  final String date;
  final String time;
  final int partySize;
  final String status;

  const ReservationModel({
    required this.id,
    required this.restaurantId,
    required this.date,
    required this.time,
    required this.partySize,
    required this.status,
  });

  factory ReservationModel.fromJson(Map<String, dynamic> json) {
    return ReservationModel(
      id: json['id'] as String,
      restaurantId: json['restaurantId'] as String,
      date: json['date'] as String,
      time: json['time'] as String,
      partySize: json['partySize'] as int,
      status: json['status'] as String,
    );
  }
}
```

- [ ] **Step 3: Write `cart_item_model.dart`**

```dart
class CartItemModel {
  final String menuItemId;
  final String name;
  final double price;
  final int quantity;
  final String category;

  const CartItemModel({
    required this.menuItemId,
    required this.name,
    required this.price,
    required this.quantity,
    required this.category,
  });

  Map<String, dynamic> toOrderItemJson() => {
        'menuItemId': menuItemId,
        'name': name,
        'price': price,
        'quantity': quantity,
        'category': category,
      };
}
```

- [ ] **Step 4: Verify**

Run: `cd mobile && flutter analyze`
Expected: no new issues.

- [ ] **Step 5: Commit**

```bash
cd mobile
git add lib/features/booking/models
git commit -m "feat(mobile): add booking feature models"
```

---

### Task 6: `BookingRepository`

**Files:**
- Create: `mobile/lib/features/booking/data/booking_repository.dart`

**Interfaces:**
- Consumes: `ApiClient` (`get`/`post`), `SlotModel`, `ReservationModel`, `CartItemModel` (Task 5).
- Produces: `abstract class BookingRepository` with `Future<List<SlotModel>> getAvailability(String restaurantId, String date)`, `Future<ReservationModel> createReservation({required String restaurantId, required String date, required String time, required int partySize, String? specialRequests})`, `Future<PaymentIntentResult> createPaymentIntent({required String reservationId, required List<CartItemModel> orderItems})`; `class PaymentIntentResult { clientSecret, paymentId, amount }`; `class ApiBookingRepository implements BookingRepository`.

- [ ] **Step 1: Write the repository**

```dart
import '../../../core/network/api_client.dart';
import '../models/cart_item_model.dart';
import '../models/reservation_model.dart';
import '../models/slot_model.dart';

class PaymentIntentResult {
  final String clientSecret;
  final String paymentId;
  final double amount;

  const PaymentIntentResult({
    required this.clientSecret,
    required this.paymentId,
    required this.amount,
  });
}

abstract class BookingRepository {
  Future<List<SlotModel>> getAvailability(String restaurantId, String date);

  Future<ReservationModel> createReservation({
    required String restaurantId,
    required String date,
    required String time,
    required int partySize,
    String? specialRequests,
  });

  Future<PaymentIntentResult> createPaymentIntent({
    required String reservationId,
    required List<CartItemModel> orderItems,
  });
}

class ApiBookingRepository implements BookingRepository {
  final ApiClient _apiClient;

  ApiBookingRepository(this._apiClient);

  @override
  Future<List<SlotModel>> getAvailability(String restaurantId, String date) async {
    final json = await _apiClient.get(
      '/restaurants/$restaurantId/availability',
      query: {'date': date},
    );
    if (json is! List) return [];
    return json
        .whereType<Map<String, dynamic>>()
        .map(SlotModel.fromJson)
        .toList();
  }

  @override
  Future<ReservationModel> createReservation({
    required String restaurantId,
    required String date,
    required String time,
    required int partySize,
    String? specialRequests,
  }) async {
    final json = await _apiClient.post('/reservations', body: {
      'restaurantId': restaurantId,
      'date': date,
      'time': time,
      'partySize': partySize,
      if (specialRequests != null && specialRequests.isNotEmpty)
        'specialRequests': specialRequests,
    }) as Map<String, dynamic>;
    return ReservationModel.fromJson(json);
  }

  @override
  Future<PaymentIntentResult> createPaymentIntent({
    required String reservationId,
    required List<CartItemModel> orderItems,
  }) async {
    final json = await _apiClient.post('/payments/create-intent', body: {
      'reservationId': reservationId,
      'orderItems': orderItems.map((i) => i.toOrderItemJson()).toList(),
    }) as Map<String, dynamic>;
    return PaymentIntentResult(
      clientSecret: json['clientSecret'] as String,
      paymentId: json['paymentId'] as String,
      amount: (json['amount'] as num).toDouble(),
    );
  }
}
```

- [ ] **Step 2: Verify**

Run: `cd mobile && flutter analyze`
Expected: no new issues.

- [ ] **Step 3: Commit**

```bash
cd mobile
git add lib/features/booking/data/booking_repository.dart
git commit -m "feat(mobile): add BookingRepository"
```

---

### Task 7: Date/time/party step widget

**Files:**
- Create: `mobile/lib/features/booking/widgets/booking_date_time_step.dart`

**Interfaces:**
- Consumes: `SlotModel`, `BookingRepository.getAvailability` (called by the parent screen, not this widget — see Interfaces below), `AppColors`.
- Produces: `class BookingDateTimeStep extends StatelessWidget` with constructor
  `{required DateTime date, required void Function(DateTime) onDateChanged,
  required List<SlotModel>? slots, required bool loadingSlots, required
  String? selectedTime, required void Function(String) onTimeSelected,
  required int partySize, required int maxParty, required void
  Function(int) onPartySizeChanged, required String specialRequests, required
  void Function(String) onSpecialRequestsChanged, required VoidCallback
  onContinue, required bool canContinue}`. This widget is presentation-only —
  it does not fetch data itself; `BookingFlowScreen` (Task 9) owns the
  `getAvailability` call and passes slots down, same division of
  responsibility as `ChatInput` (presentation) vs `ChatProvider` (data) in the
  chat feature.

- [ ] **Step 1: Write the widget**

```dart
import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../models/slot_model.dart';

class BookingDateTimeStep extends StatelessWidget {
  final DateTime date;
  final ValueChanged<DateTime> onDateChanged;
  final List<SlotModel>? slots;
  final bool loadingSlots;
  final String? selectedTime;
  final ValueChanged<String> onTimeSelected;
  final int partySize;
  final int maxParty;
  final ValueChanged<int> onPartySizeChanged;
  final String specialRequests;
  final ValueChanged<String> onSpecialRequestsChanged;
  final VoidCallback onContinue;
  final bool canContinue;

  const BookingDateTimeStep({
    super.key,
    required this.date,
    required this.onDateChanged,
    required this.slots,
    required this.loadingSlots,
    required this.selectedTime,
    required this.onTimeSelected,
    required this.partySize,
    required this.maxParty,
    required this.onPartySizeChanged,
    required this.specialRequests,
    required this.onSpecialRequestsChanged,
    required this.onContinue,
    required this.canContinue,
  });

  Future<void> _pickDate(BuildContext context) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: date,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 90)),
    );
    if (picked != null) onDateChanged(picked);
  }

  @override
  Widget build(BuildContext context) {
    final dateLabel =
        '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('Date', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
        const SizedBox(height: 6),
        OutlinedButton.icon(
          onPressed: () => _pickDate(context),
          icon: const Icon(Icons.calendar_today, size: 16),
          label: Text(dateLabel),
        ),
        const SizedBox(height: 20),
        const Text('Time', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
        const SizedBox(height: 6),
        if (loadingSlots)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 8),
            child: LinearProgressIndicator(),
          )
        else
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: (slots ?? const <SlotModel>[]).map((s) {
              final isSelected = selectedTime == s.time;
              return ChoiceChip(
                label: Text(s.time),
                selected: isSelected,
                onSelected: s.available ? (_) => onTimeSelected(s.time) : null,
                disabledColor: AppColors.muted,
                selectedColor: AppColors.primary,
                labelStyle: TextStyle(
                  color: !s.available
                      ? AppColors.mutedForeground
                      : isSelected
                          ? AppColors.foreground
                          : null,
                  decoration: !s.available ? TextDecoration.lineThrough : null,
                ),
              );
            }).toList(),
          ),
        const SizedBox(height: 20),
        const Text('Party size', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
        const SizedBox(height: 6),
        Row(
          children: [
            IconButton(
              onPressed: partySize > 1 ? () => onPartySizeChanged(partySize - 1) : null,
              icon: const Icon(Icons.remove_circle_outline),
            ),
            Text('$partySize ${partySize == 1 ? 'person' : 'people'}'),
            IconButton(
              onPressed: partySize < maxParty ? () => onPartySizeChanged(partySize + 1) : null,
              icon: const Icon(Icons.add_circle_outline),
            ),
          ],
        ),
        const SizedBox(height: 20),
        const Text('Special requests (optional)', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
        const SizedBox(height: 6),
        TextField(
          maxLength: 500,
          maxLines: 2,
          onChanged: onSpecialRequestsChanged,
          decoration: const InputDecoration(
            hintText: 'Allergies, dietary needs, anniversary…',
          ),
        ),
        const SizedBox(height: 12),
        ElevatedButton(
          onPressed: canContinue ? onContinue : null,
          child: const Text('Choose Your Order'),
        ),
      ],
    );
  }
}
```

- [ ] **Step 2: Verify**

Run: `cd mobile && flutter analyze`
Expected: no new issues.

- [ ] **Step 3: Commit**

```bash
cd mobile
git add lib/features/booking/widgets/booking_date_time_step.dart
git commit -m "feat(mobile): add booking date/time/party step widget"
```

---

### Task 8: Menu/cart step widget

**Files:**
- Create: `mobile/lib/features/booking/widgets/booking_menu_cart_step.dart`

**Interfaces:**
- Consumes: `MenuItemModel` (`mobile/lib/features/restaurants/models/menu_item_model.dart`, already exists), `CartItemModel` (Task 5), `AppColors`.
- Produces: `class BookingMenuCartStep extends StatelessWidget` with
  constructor `{required List<MenuItemModel> menuItems, required bool
  loadingMenu, required Map<String, CartItemModel> cart, required void
  Function(MenuItemModel, int) onQuantityChanged, required VoidCallback
  onContinue, required bool canContinue}`.

- [ ] **Step 1: Write the widget**

```dart
import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../restaurants/models/menu_item_model.dart';
import '../models/cart_item_model.dart';

class BookingMenuCartStep extends StatelessWidget {
  final List<MenuItemModel> menuItems;
  final bool loadingMenu;
  final Map<String, CartItemModel> cart;
  final void Function(MenuItemModel item, int quantity) onQuantityChanged;
  final VoidCallback onContinue;
  final bool canContinue;

  const BookingMenuCartStep({
    super.key,
    required this.menuItems,
    required this.loadingMenu,
    required this.cart,
    required this.onQuantityChanged,
    required this.onContinue,
    required this.canContinue,
  });

  @override
  Widget build(BuildContext context) {
    if (loadingMenu) {
      return const Center(child: CircularProgressIndicator());
    }
    if (menuItems.isEmpty) {
      return const Center(child: Text('No menu items available'));
    }

    final categories = menuItems.map((i) => i.category).toSet().toList();
    final totalItems = cart.values.fold<int>(0, (s, i) => s + i.quantity);

    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: categories.expand((category) {
              final items = menuItems.where((i) => i.category == category).toList();
              return [
                Padding(
                  padding: const EdgeInsets.only(bottom: 8, top: 8),
                  child: Text(
                    category,
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12, color: AppColors.mutedForeground),
                  ),
                ),
                ...items.map((item) {
                  final qty = cart[item.id]?.quantity ?? 0;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(item.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                              Text('LKR ${item.price.toStringAsFixed(0)}',
                                  style: const TextStyle(color: AppColors.primary, fontSize: 13)),
                            ],
                          ),
                        ),
                        IconButton(
                          onPressed: qty > 0 ? () => onQuantityChanged(item, qty - 1) : null,
                          icon: const Icon(Icons.remove_circle_outline),
                        ),
                        Text('$qty'),
                        IconButton(
                          onPressed: () => onQuantityChanged(item, qty + 1),
                          icon: const Icon(Icons.add_circle_outline),
                        ),
                      ],
                    ),
                  );
                }),
              ];
            }).toList(),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: ElevatedButton(
            onPressed: canContinue ? onContinue : null,
            child: Text(totalItems > 0 ? 'Review Order ($totalItems item${totalItems == 1 ? '' : 's'})' : 'Review Order'),
          ),
        ),
      ],
    );
  }
}
```

- [ ] **Step 2: Verify**

Run: `cd mobile && flutter analyze`
Expected: no new issues.

- [ ] **Step 3: Commit**

```bash
cd mobile
git add lib/features/booking/widgets/booking_menu_cart_step.dart
git commit -m "feat(mobile): add booking menu/cart step widget"
```

---

### Task 9: Review/pay step widget (Stripe Payment Sheet)

**Files:**
- Create: `mobile/lib/features/booking/widgets/booking_review_pay_step.dart`

**Interfaces:**
- Consumes: `CartItemModel` (Task 5), `flutter_stripe`'s `Stripe.instance.initPaymentSheet`/`presentPaymentSheet`/`SetupPaymentSheetParameters`/`StripeException`/`FailureCode` (package API, confirmed against the installed `flutter_stripe-13.1.0` / `stripe_platform_interface-13.1.0` sources).
- Produces: `class BookingReviewPayStep extends StatefulWidget` with
  constructor `{required DateTime date, required String time, required int
  partySize, required List<CartItemModel> cartItems, required Future<void>
  Function() onPay}` — `onPay` is supplied by `BookingFlowScreen` (Task 10)
  and does the actual reservation+PaymentIntent+PaymentSheet orchestration
  (kept out of this widget so the widget stays presentation-focused: bill
  display + a button + local error/loading state for the button itself).

- [ ] **Step 1: Write the widget**

```dart
import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../models/cart_item_model.dart';

const _serviceChargeRate = 0.10;

class BookingReviewPayStep extends StatefulWidget {
  final DateTime date;
  final String time;
  final int partySize;
  final List<CartItemModel> cartItems;
  final Future<void> Function() onPay;

  const BookingReviewPayStep({
    super.key,
    required this.date,
    required this.time,
    required this.partySize,
    required this.cartItems,
    required this.onPay,
  });

  @override
  State<BookingReviewPayStep> createState() => _BookingReviewPayStepState();
}

class _BookingReviewPayStepState extends State<BookingReviewPayStep> {
  bool _submitting = false;
  String? _error;

  Future<void> _submit() async {
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await widget.onPay();
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final subtotal = widget.cartItems.fold<double>(0, (s, i) => s + i.price * i.quantity);
    final serviceCharge = (subtotal * _serviceChargeRate).round();
    final total = subtotal + serviceCharge;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: AppColors.muted, borderRadius: BorderRadius.circular(12)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('${widget.date.year}-${widget.date.month.toString().padLeft(2, '0')}-${widget.date.day.toString().padLeft(2, '0')} at ${widget.time}'),
              Text('${widget.partySize} ${widget.partySize == 1 ? 'person' : 'people'}'),
            ],
          ),
        ),
        const SizedBox(height: 16),
        const Text('Your order', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
        const SizedBox(height: 8),
        ...widget.cartItems.map((item) => Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('${item.quantity}× ${item.name}'),
                  Text('LKR ${(item.price * item.quantity).toStringAsFixed(0)}'),
                ],
              ),
            )),
        const Divider(height: 24),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [const Text('Subtotal'), Text('LKR ${subtotal.toStringAsFixed(0)}')],
        ),
        const SizedBox(height: 4),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [const Text('Service charge (10%)'), Text('LKR ${serviceCharge.toStringAsFixed(0)}')],
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Total', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            Text('LKR ${total.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          ],
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          Text(_error!, style: const TextStyle(color: AppColors.destructive)),
        ],
        const SizedBox(height: 20),
        ElevatedButton(
          onPressed: _submitting ? null : _submit,
          child: _submitting
              ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
              : Text('Reserve & Pay LKR ${total.toStringAsFixed(0)}'),
        ),
      ],
    );
  }
}
```

- [ ] **Step 2: Verify**

Run: `cd mobile && flutter analyze`
Expected: no new issues.

- [ ] **Step 3: Commit**

```bash
cd mobile
git add lib/features/booking/widgets/booking_review_pay_step.dart
git commit -m "feat(mobile): add booking review/pay step widget"
```

---

### Task 10: `BookingFlowScreen` — orchestration + Payment Sheet call

**Files:**
- Create: `mobile/lib/features/booking/screens/booking_flow_screen.dart`

**Interfaces:**
- Consumes: `BookingRepository` (Task 6, via `context.read<BookingRepository>()` — registered in Task 11), `RestaurantRepository.getMenu`/`getRestaurantById` (already exist), `BookingDateTimeStep` (Task 7), `BookingMenuCartStep` (Task 8), `BookingReviewPayStep` (Task 9), `CartItemModel`/`SlotModel`/`ReservationModel` (Task 5), `flutter_stripe`.
- Produces: `class BookingFlowScreen extends StatefulWidget` with constructor `{required String restaurantId}`.

- [ ] **Step 1: Write the screen**

```dart
import 'package:flutter/material.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:provider/provider.dart';
import '../../restaurants/data/restaurant_repository.dart';
import '../../restaurants/models/menu_item_model.dart';
import '../../restaurants/models/restaurant_model.dart';
import '../data/booking_repository.dart';
import '../models/cart_item_model.dart';
import '../models/slot_model.dart';
import '../widgets/booking_date_time_step.dart';
import '../widgets/booking_menu_cart_step.dart';
import '../widgets/booking_review_pay_step.dart';

class BookingFlowScreen extends StatefulWidget {
  final String restaurantId;

  const BookingFlowScreen({super.key, required this.restaurantId});

  @override
  State<BookingFlowScreen> createState() => _BookingFlowScreenState();
}

class _BookingFlowScreenState extends State<BookingFlowScreen> {
  int _step = 1;

  RestaurantModel? _restaurant;
  DateTime _date = DateTime.now();
  String? _time;
  int _partySize = 2;
  String _specialRequests = '';
  List<SlotModel>? _slots;
  bool _loadingSlots = false;

  List<MenuItemModel> _menuItems = [];
  bool _loadingMenu = false;
  final Map<String, CartItemModel> _cart = {};

  String? _reservationId;

  @override
  void initState() {
    super.initState();
    _loadRestaurant();
    _loadSlots();
  }

  Future<void> _loadRestaurant() async {
    final restaurant =
        await context.read<RestaurantRepository>().getRestaurantById(widget.restaurantId);
    if (mounted) setState(() => _restaurant = restaurant);
  }

  Future<void> _loadSlots() async {
    setState(() => _loadingSlots = true);
    final dateStr =
        '${_date.year.toString().padLeft(4, '0')}-${_date.month.toString().padLeft(2, '0')}-${_date.day.toString().padLeft(2, '0')}';
    try {
      final slots = await context
          .read<BookingRepository>()
          .getAvailability(widget.restaurantId, dateStr);
      if (mounted) setState(() => _slots = slots);
    } catch (_) {
      if (mounted) setState(() => _slots = null);
    } finally {
      if (mounted) setState(() => _loadingSlots = false);
    }
  }

  Future<void> _loadMenu() async {
    if (_menuItems.isNotEmpty) return;
    setState(() => _loadingMenu = true);
    try {
      final items = await context.read<RestaurantRepository>().getMenu(widget.restaurantId);
      if (mounted) setState(() => _menuItems = items);
    } finally {
      if (mounted) setState(() => _loadingMenu = false);
    }
  }

  void _setQuantity(MenuItemModel item, int quantity) {
    setState(() {
      if (quantity <= 0) {
        _cart.remove(item.id);
      } else {
        _cart[item.id] = CartItemModel(
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: quantity,
          category: item.category,
        );
      }
    });
  }

  Future<void> _pay() async {
    final bookingRepo = context.read<BookingRepository>();

    // Reuse the reservation from a previous attempt if the user is retrying
    // after a declined/cancelled payment, instead of creating a duplicate.
    _reservationId ??= (await bookingRepo.createReservation(
      restaurantId: widget.restaurantId,
      date: '${_date.year.toString().padLeft(4, '0')}-${_date.month.toString().padLeft(2, '0')}-${_date.day.toString().padLeft(2, '0')}',
      time: _time!,
      partySize: _partySize,
      specialRequests: _specialRequests.isEmpty ? null : _specialRequests,
    )).id;

    final intent = await bookingRepo.createPaymentIntent(
      reservationId: _reservationId!,
      orderItems: _cart.values.toList(),
    );

    await Stripe.instance.initPaymentSheet(
      paymentSheetParameters: SetupPaymentSheetParameters(
        paymentIntentClientSecret: intent.clientSecret,
        merchantDisplayName: 'Restaurant Chatbot',
      ),
    );

    try {
      await Stripe.instance.presentPaymentSheet();
    } on StripeException catch (e) {
      if (e.error.code == FailureCode.Canceled) return; // not an error, just return to review
      throw Exception(e.error.localizedMessage ?? e.error.message ?? 'Payment failed');
    }

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Payment successful! Your table is booked.')),
    );
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_restaurant?.name ?? 'Reserve a table'),
        leading: _step > 1
            ? IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => setState(() => _step -= 1),
              )
            : null,
      ),
      body: Builder(builder: (context) {
        switch (_step) {
          case 1:
            return BookingDateTimeStep(
              date: _date,
              onDateChanged: (d) {
                setState(() => _date = d);
                _loadSlots();
              },
              slots: _slots,
              loadingSlots: _loadingSlots,
              selectedTime: _time,
              onTimeSelected: (t) => setState(() => _time = t),
              partySize: _partySize,
              maxParty: _restaurant?.totalSeats ?? 20,
              onPartySizeChanged: (p) => setState(() => _partySize = p),
              specialRequests: _specialRequests,
              onSpecialRequestsChanged: (v) => _specialRequests = v,
              canContinue: _time != null,
              onContinue: () {
                setState(() => _step = 2);
                _loadMenu();
              },
            );
          case 2:
            return BookingMenuCartStep(
              menuItems: _menuItems,
              loadingMenu: _loadingMenu,
              cart: _cart,
              onQuantityChanged: _setQuantity,
              canContinue: _cart.isNotEmpty,
              onContinue: () => setState(() => _step = 3),
            );
          default:
            return BookingReviewPayStep(
              date: _date,
              time: _time!,
              partySize: _partySize,
              cartItems: _cart.values.toList(),
              onPay: _pay,
            );
        }
      }),
    );
  }
}
```

- [ ] **Step 2: Verify**

Run: `cd mobile && flutter analyze`
Expected: no new issues.

- [ ] **Step 3: Commit**

```bash
cd mobile
git add lib/features/booking/screens/booking_flow_screen.dart
git commit -m "feat(mobile): add BookingFlowScreen orchestrating the 3-step booking flow"
```

---

### Task 11: Wire router, provider, and the "Book a table" button

**Files:**
- Modify: `mobile/lib/main.dart`
- Modify: `mobile/lib/core/router/app_router.dart`
- Modify: `mobile/lib/features/restaurants/screens/restaurant_detail_screen.dart`

**Interfaces:**
- Consumes: `ApiBookingRepository`, `BookingRepository` (Task 6), `BookingFlowScreen` (Task 10).
- Produces: `BookingRepository` available app-wide via `context.read<BookingRepository>()`; `/restaurants/:id/book` route; a working "Book a table" button.

- [ ] **Step 1: Register `BookingRepository` in `main.dart`**

Add the import near the other `features/` imports:
```dart
import 'features/booking/data/booking_repository.dart';
```

After `final chatRepository = ApiChatRepository(apiClient);`, add:
```dart
    final bookingRepository = ApiBookingRepository(apiClient);
```

In the `MultiProvider`'s `providers` list, after the
`ChangeNotifierProvider<ChatProvider>` entry, add:
```dart
        Provider<BookingRepository>.value(value: bookingRepository),
```
(`Provider`, not `ChangeNotifierProvider` — `BookingRepository` isn't a
`ChangeNotifier`, same as `RestaurantRepository`'s registration just above it.)

- [ ] **Step 2: Add the route in `app_router.dart`**

Add the import:
```dart
import '../../features/booking/screens/booking_flow_screen.dart';
```

Add, as a top-level route (sibling of the existing `/restaurants/:id` route,
same pattern):
```dart
      GoRoute(
        path: '/restaurants/:id/book',
        builder: (context, state) => BookingFlowScreen(restaurantId: state.pathParameters['id']!),
      ),
```

- [ ] **Step 3: Wire the "Book a table" button**

In `restaurant_detail_screen.dart`, replace:
```dart
            ElevatedButton(
              key: const Key('book_table_button'),
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Booking will be available in the next update')),
                );
              },
              child: const Text('Book a table'),
            ),
```
with:
```dart
            ElevatedButton(
              key: const Key('book_table_button'),
              onPressed: () => context.push('/restaurants/${widget.restaurantId}/book'),
              child: const Text('Book a table'),
            ),
```
(Add `import 'package:go_router/go_router.dart';` at the top of this file if
it isn't already imported.)

- [ ] **Step 4: Verify**

Run: `cd mobile && flutter analyze`
Expected: no new issues.

- [ ] **Step 5: Commit**

```bash
cd mobile
git add lib/main.dart lib/core/router/app_router.dart lib/features/restaurants/screens/restaurant_detail_screen.dart
git commit -m "feat(mobile): wire booking flow into the restaurant detail screen"
```

---

### Task 12: Manual end-to-end verification

No new files — exercises the full flow against the real backend + Stripe test
mode, replacing an automated test pass (see Global Constraints). Per this
session's established preference, this is a handoff — don't drive
`flutter run`/`adb` yourself.

**Prerequisites:** backend + AI service running and reachable from the test
device (reuse the `--dart-define=API_BASE_URL=http://<lan-ip>:3000/api`
pattern from earlier in this session if still valid).

- [ ] **Step 1: Run the app and open a restaurant**

```bash
cd mobile
flutter run -d <device-id> --dart-define=API_BASE_URL=http://<host-lan-ip>:3000/api
```

Log in, open any restaurant, tap "Book a table".

- [ ] **Step 2: Step 1 — date/time/party**

Confirm slots load for today's date, unavailable slots are struck through and
un-tappable, party size respects the restaurant's `totalSeats` cap, and
"Choose Your Order" is disabled until a time slot is picked.

- [ ] **Step 3: Step 2 — menu/cart**

Confirm menu items load grouped by category, quantity steppers work, and
"Review Order" is disabled until the cart has at least one item.

- [ ] **Step 4: Step 3 — review & pay**

Confirm the bill (subtotal + 10% service charge + total) matches the cart.
Tap "Reserve & Pay" — Stripe's native Payment Sheet should appear **in the
app** (no browser). Use Stripe's test card `4242 4242 4242 4242`, any future
expiry, any CVC, any postal code.

- [ ] **Step 5: Verify success path**

Confirm a success message appears and the screen returns to the restaurant
detail page. Then check `backend`'s logs or DB for a `Payment` row with
status `SUCCEEDED` for that reservation (the webhook should have flipped it
from `PENDING`) — requires the backend's Stripe webhook to be reachable (a
local Stripe CLI listener forwarding to `localhost:3000/api/payments/webhook`
if testing locally without a public URL).

- [ ] **Step 6: Verify cancel path**

Repeat the flow, but dismiss the Payment Sheet without entering card details.
Confirm you're quietly returned to the review step with no error message.

- [ ] **Step 7: Verify decline path**

Repeat using Stripe's decline test card `4000 0000 0000 0002`. Confirm the
error is shown inline on the review step and "Reserve & Pay" can be tapped
again — confirm it does **not** create a second reservation (check the
backend/DB for only one `Reservation` row from this test session) and that
the retry successfully creates a fresh PaymentIntent for the same
reservation.

- [ ] **Step 8: Report results**

No commit for this task — report which of steps 2–7 passed and any
discrepancies found.
