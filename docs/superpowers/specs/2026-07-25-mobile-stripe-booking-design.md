# Mobile Stripe Booking Integration — Design

## Goal

"Book a table" on mobile currently shows a snackbar ("Booking will be available in
the next update") and does nothing else — there is no reservation, menu/cart, or
payment flow on mobile at all. Build the equivalent of web's `BookTableDialog`
(date/time/party → menu/cart → review & pay) ending in a native Stripe payment,
fixing a real payment-forgery hole in the backend endpoint this flow depends on
along the way.

## Background

### Web's existing flow (`frontend/src/components/customer/BookTableDialog.tsx`)

A single modal component with local `step: 1 | 2 | 3` state:
1. Date picker + live time-slot availability (`GET /restaurants/:id/availability?date=`)
   + party-size stepper + optional special requests.
2. Menu browse (`GET /restaurants/:id/menu`) + a local cart (`Map<menuItemId, CartItem>`).
3. Bill review (subtotal + 10% service charge) → `POST /reservations` to create the
   reservation, then `POST /payments/checkout-session` (Stripe Checkout Session,
   hosted page) → `window.location.href = paymentUrl`.

### The security hole this design fixes

`backend/src/modules/payment/payment.service.ts`:
- `createCheckoutSession` (used by the flow above) re-resolves authoritative prices
  from the DB for any `orderItems` referencing a `menuItemId` and computes the total
  server-side. Comment: *"Client-supplied prices are never trusted for identified
  menu items."*
- `createPaymentIntent` (currently unused by any client — the webhook comment calls
  it "legacy/fallback") takes `{reservationId, amount}` and creates a Stripe
  PaymentIntent with `amount` **taken directly from the request body, unverified**.
  Any authenticated user could POST `{reservationId, amount: 1}` today and get a
  PaymentIntent for LKR 1 regardless of the real order total. This project has
  already fixed exactly this class of bug once (commit `71c1521 fix(security):
  enforce server-side pricing and remove payment forgery endpoint`) — this endpoint
  was evidently missed.

Since the mobile flow needs `createPaymentIntent` (see "Payment mechanism" below),
fixing it is part of this design, not a separate follow-up.

## Decisions made (confirmed with user)

1. **Scope**: full booking flow (date/time/party, menu/cart, review, payment) —
   not just a redirect-UX patch on the existing chat payment link.
2. **Payment mechanism**: native Stripe **Payment Sheet** via the `flutter_stripe`
   package (resolves cleanly at `13.1.0` against this project's Flutter/Dart SDK) —
   not a browser redirect to Stripe's hosted Checkout page. The user never leaves
   the app; no dead-end redirect to a web success page to solve.
3. **Backend fix**: `createPaymentIntent` gets fixed to recompute the total
   server-side as part of this work (see below), not left as a known hole.
4. **Out of scope**: the `/reservations` bottom-nav tab (a "my bookings" list) stays
   a `ComingSoonScreen` — that's a different feature (`GET /reservations`) from
   booking creation, matching web's own separation (`BookTableDialog` is a modal on
   the restaurant page; there's no "my bookings" page found in the web app either).

## Backend changes

### `backend/src/modules/payment/payment.schema.ts`

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
(`OrderItemSchema` already exists in this file, shared with `CreateCheckoutSessionBodySchema`.)

`PaymentIntentResponseSchema` gains `paymentId` and `amount`:
```ts
const PaymentIntentResponseSchema = z
  .object({
    clientSecret: z.string(),
    paymentId: z.string().uuid(),
    amount: z.number(),
  })
  .openapi("PaymentIntentResponse");
```

### `backend/src/modules/payment/payment.service.ts`

Extract the existing price-verification block out of `createCheckoutSession` into
a shared helper so both payment paths use one trusted-pricing implementation:

```ts
interface VerifiedOrder {
  verifiedItems: OrderItemInput[];
  subtotal: number;
  serviceCharge: number;
  total: number;
}

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
```

`createCheckoutSession` calls this helper instead of inlining the same logic
(behavior unchanged — same computation, just deduplicated).

Rewrite `createPaymentIntent`:
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

  const payment = await prisma.payment.create({
    data: {
      reservationId,
      userId,
      amount: total,
      currency: "LKR",
      stripePaymentId: intent.id,
      status: "PENDING",
      orderItems: verifiedItems as object[],
    },
  });

  return { clientSecret: intent.client_secret!, paymentId: payment.id, amount: total };
};
```

The existing webhook `payment_intent.succeeded` handler's "existing row" branch
(`payment.service.ts` around line 193-198) already just updates status to
`SUCCEEDED` — no change needed there; it now always finds a real row instead of
occasionally reconstructing one from scratch.

### `backend/src/modules/payment/payment.controller.ts`

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

No route changes needed — `POST /payments/create-intent` already exists and is
already `authenticate`-gated.

## Mobile changes

### New dependency

`flutter_stripe: ^13.1.0` (resolved via `flutter pub add --dry-run` against this
project's exact lockfile).

### Prerequisite: `RestaurantModel` is missing `totalSeats`

Step 1's party-size cap needs `restaurant.totalSeats` (matching web's
`totalSeats ?? 20`), but `mobile/lib/features/restaurants/models/restaurant_model.dart`
never parses it even though the backend's `Restaurant` model has it
(`totalSeats Int?` in `backend/prisma/schema.prisma`) and the REST response
includes it. Add `final int? totalSeats;` to `RestaurantModel` and parse it in
`fromJson` (`totalSeats: json['totalSeats'] as int?`) as part of this work.

### New module: `lib/features/booking/`

```
lib/features/booking/
  models/
    slot_model.dart          # time, available, totalTables, bookedTables
    reservation_model.dart   # id, restaurantId, date, time, partySize, status, ...
    cart_item_model.dart     # menuItemId, name, price, quantity, category
  data/
    booking_repository.dart  # abstract BookingRepository + ApiBookingRepository
  screens/
    booking_flow_screen.dart # single StatefulWidget, local step (1/2/3) state
  widgets/
    booking_date_time_step.dart
    booking_menu_cart_step.dart
    booking_review_pay_step.dart
```

`BookingRepository`:
```dart
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
```
`PaymentIntentResult { clientSecret, paymentId, amount }` — mirrors the fixed
backend response exactly.

`ApiBookingRepository` calls, via the existing `ApiClient`:
- `GET /restaurants/$restaurantId/availability?date=$date` (no auth needed, but
  `ApiClient` attaches the bearer token anyway when present — harmless, backend
  route itself has no `authenticate` middleware).
- `POST /reservations` with `{restaurantId, date, time, partySize, specialRequests}`.
- `POST /payments/create-intent` with `{reservationId, orderItems: [...]}` (each
  item shaped `{menuItemId, name, price, quantity, category}`, mirroring
  `OrderItemSchema`).

### `BookingFlowScreen`

Pushed via `context.push('/restaurants/${restaurant.id}/book')` from the
restaurant detail screen's "Book a table" button (`restaurant_detail_screen.dart`
lines 121-129 — replace the `SnackBar` `onPressed` with this navigation).

Local state, mirroring `BookTableDialog`'s React state 1:1: `date`, `time`,
`partySize`, `specialRequests`, `slots`, `cart (Map<String, CartItemModel>)`,
`step`. A step-indicator row (3 dots, matching web's) at the top.

**Step 1** (`BookingDateTimeStep`): date field (native date picker), slot chips
from `getAvailability` (loading skeleton while fetching, disabled+strikethrough
for unavailable slots — same as web), party-size stepper capped at
`restaurant.totalSeats ?? 20`, optional special-requests field. "Choose Your
Order" button disabled until date+time are set.

**Step 2** (`BookingMenuCartStep`): reuses
`RestaurantRepository.getMenu(restaurantId)` (already implemented), grouped by
category, quantity steppers per item writing into the cart map. Footer "Review
Order" button disabled until the cart is non-empty.

**Step 3** (`BookingReviewPayStep`): booking summary (date/time/party), cart line
items, subtotal + 10% service charge + total (client-side preview — the backend
recomputes authoritatively regardless). "Reserve & Pay" button:
1. `createReservation(...)` → `reservationId`.
2. `createPaymentIntent(reservationId: ..., orderItems: cartItems)` →
   `{clientSecret, paymentId, amount}`.
3. `Stripe.instance.initPaymentSheet(paymentIntentClientSecret: clientSecret,
   merchantDisplayName: 'Restaurant Chatbot')` then `presentPaymentSheet()`.

### Stripe SDK init

New `lib/core/payments/stripe_config.dart`:
```dart
class StripeConfig {
  StripeConfig._();
  static const String publishableKey =
      'pk_test_51Tb9sNKVKJmvD2D7TrDNBGE51vNzY48ZuubhutJ4yRtpU8xxMEB31os9AmEijSjapLijeB0paLsJGABmMfq30Ai200rboAnSiZ';
}
```
(Same test-mode key already in `backend/.env` / `frontend/.env` as
`STRIPE_PUBLIC_KEY` / `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` — publishable keys are
designed to be embedded in client code, unlike the secret key.)

In `main.dart`, before `runApp`:
```dart
Stripe.publishableKey = StripeConfig.publishableKey;
await Stripe.instance.applySettings();
```

### Outcome handling

- **Success** (`presentPaymentSheet()` returns without throwing): show a simple
  confirmation (e.g. a `SnackBar` or a small success screen) then
  `context.pop()` back to the restaurant detail screen. The Stripe webhook
  independently confirms/updates the backend `Payment` row asynchronously — the
  client-side success is immediate UX feedback only, same trust model as web
  (web also doesn't wait for the webhook before showing its `/payment/success`
  page).
- **User cancels** (`StripeException` with `error.code ==
  FailureCode.Canceled`): swallow it silently, stay on the review step — same
  "a cancel isn't an error" treatment already used for Google Sign-In
  cancellation in `auth_provider.dart`.
- **Payment fails** (card declined, etc.): show the exception's message inline
  on the review step, let the user retry. The reservation row already exists at
  this point (created before payment, matching web's exact ordering) and simply
  stays unpaid — same as an abandoned web Checkout session.

### Router change

`mobile/lib/core/router/app_router.dart` — add, as a top-level route (sibling of
`/restaurants/:id`, same pattern):
```dart
GoRoute(
  path: '/restaurants/:id/book',
  builder: (context, state) => BookingFlowScreen(restaurantId: state.pathParameters['id']!),
),
```

## Out of scope

- "My bookings" list (`/reservations` tab) — stays a `ComingSoonScreen`.
- Changing the existing web Checkout Session flow or the existing chat
  payment-link flow — both untouched, still work exactly as before.
- Refunds, cancellations, or editing an existing reservation from mobile.
- Payment history screen on mobile (`GET /payments/history` exists but nothing
  in this design consumes it).
