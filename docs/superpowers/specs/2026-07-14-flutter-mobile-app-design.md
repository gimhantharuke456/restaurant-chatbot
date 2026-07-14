# Flutter Mobile App — Design

## Background

The project spec requires a mobile application (Android/iOS) alongside the web platform, with
GPS-based discovery, push notifications, and camera integration for review uploads. None of this
exists in the repo today — only the Next.js web frontend.

## Scope decision

The Flutter app clones the **customer-facing app only** (`frontend/src/app/(customer)/*` and
`frontend/src/app/login`), not the admin panel or restaurant portal. Those remain web-only
back-office tools. The audit's mobile-specific asks (GPS, push, camera) are all customer concerns.

Customer surface being ported: Home, Chat, Restaurant details, Reservations, Favorites, Waitlist,
Loyalty, Complaints, Notifications, Profile, Login/Register.

**Target platform: Android only.** No iOS, web, or desktop platform folders are configured.

## Cross-cutting technical decisions (apply to all phases)

- **State management**: Provider (`ChangeNotifier` + `MultiProvider`)
- **Networking**: `http` package, wrapped in a thin `ApiClient` (base URL + Bearer-token
  injection + typed `ApiException` on failure) — not `dio`
- **Routing**: `go_router`, with `redirect`-based auth guarding
- **Auth**: `firebase_core` + `firebase_auth`, wired with **dummy placeholder config** for now
  (to be swapped for real project credentials later). Mirrors the web app's email/password +
  Google sign-in. Token persisted via `flutter_secure_storage`, forwarded as `Bearer` token on
  every backend call — matches the existing Express `middleware/auth.ts`, which verifies a
  Firebase ID token via `adminAuth.verifyIdToken`.
- **Animations**: `flutter_animate` for declarative entrance/list-stagger/micro-interactions
- **Theme**: single dark `ThemeData` cloned from the web's "AgentDine Dark Orange" palette
  (`frontend/src/app/globals.css`) — background `#0f1419`→`#1a1a2e` gradient, primary `#FF6B35`,
  card `#16202f`, foreground white, destructive `#ef4444`, consistent radius scale. No light mode,
  matching web.
- **Backend connectivity (dev)**: Android emulator reaches the host's `localhost:3000` via
  `10.0.2.2`. Base URL is a `--dart-define`-able constant defaulting to `http://10.0.2.2:3000/api`.
- **Backend**: the existing Express API is reused as-is. Mobile calls it directly (no Next.js
  proxy layer needed — CORS is a browser-only concern).

## Phase roadmap

1. **Foundation & Discovery** — project scaffold, theme, Provider architecture, `ApiClient`,
   dummy-Firebase login/register, bottom-nav shell, Home (restaurant discovery/search), restaurant
   detail screen.
2. **Reservations & Booking** — table booking with menu selection + payment, reservations
   list/management. Mirrors `frontend/src/components/customer/BookTableDialog.tsx`.
3. **AI Chat** — chat screen (guest + authenticated), message history. Talks to the existing
   `/api/chat`, `/api/chat/guest`, `/api/chat/history` endpoints and their guest-message-limit
   enforcement.
4. **Engagement features** — Favorites, Waitlist, Loyalty, Notifications, Complaints, Profile.
5. **Native mobile capabilities** — GPS-based discovery (the `Restaurant` model already has
   `latitude`/`longitude`), push notifications (FCM, dummy config), camera for review photo
   uploads, plus an animation/polish pass.

Each phase is independently runnable/demoable. Only Phase 1 is designed in detail below; later
phases get their own design pass when reached.

---

## Phase 1 — Foundation & Discovery (detailed design)

### Project structure

```
lib/
  main.dart, app.dart               # entrypoint, MaterialApp.router setup
  core/
    theme/                          # app_theme.dart, app_colors.dart
    network/                        # api_client.dart, api_exception.dart
    router/                         # app_router.dart
    storage/                        # secure_storage_service.dart
    firebase/                       # dummy firebase options
  features/
    auth/
      models/                       # user_model.dart
      providers/                    # auth_provider.dart
      screens/                      # login_screen.dart, register_screen.dart
      services/                     # auth_service.dart
    restaurants/
      models/                       # restaurant_model.dart
      providers/                    # restaurant_provider.dart
      screens/                      # home_screen.dart, restaurant_detail_screen.dart
      widgets/                      # restaurant_card.dart
  shared/
    widgets/                        # buttons, loaders, bottom nav shell, etc.
```

### Screens

1. **Login** — email/password fields + Google sign-in button, matching web copy/flow
2. **Register** — name/email/password
3. **Home** — search bar + filter chips (cuisine/price/area/rating — mirrors the existing
   `RestaurantQuerySchema` query params) + restaurant card list (image, name, rating, price
   range, area)
4. **Restaurant detail** — hero image, info (address, hours, rating), menu/review/promotion
   previews (`GET /api/restaurants/:id`, `/menu`, `/reviews`, `/promotions`), "Book a table" CTA
   (wired up in Phase 2)
5. **Bottom-nav shell** — 4 tabs: Home (real), Reservations (stub), Chat (stub), More (stub —
   becomes a menu list linking to Favorites/Waitlist/Loyalty/Notifications/Complaints/Profile
   once Phase 4 lands). Nav structure is final now so later phases just fill in real screens
   instead of reworking navigation.

### Data flow

- App launch → check `flutter_secure_storage` for a token → if present, validate via
  `GET /api/auth/me`; else `go_router` redirects to `/login`
- Login/Register → Firebase SDK call → get ID token → `POST /api/auth/register` (register only)
  → store token securely → `AuthProvider` flips `isLoggedIn` → router redirects to `/home`
- Home screen → `RestaurantProvider.fetchRestaurants()` →
  `GET /api/restaurants?search=&area=&cuisine=&priceRange=&minRating=&page=&limit=` → provider
  notifies listeners → list renders
- Restaurant detail → parallel `GET /api/restaurants/:id` (+ `/menu`, `/reviews`, `/promotions`)

### Error handling

- `ApiClient` wraps `http` calls, throws a typed `ApiException(statusCode, message)` on non-2xx
  or network failure
- Providers catch `ApiException`, expose an `error` state; screens show inline error banners with
  a retry action — no silent failures
- A global 401 clears the stored token and redirects to `/login`

### Verification plan

Run on an Android emulator and confirm:
- Theme renders correctly (colors, radius, always-dark)
- Bottom-nav shell navigates between tabs, stub tabs render placeholders
- Login/register screens render with correct copy/validation/error states
- Restaurant list loads live from the local backend (`10.0.2.2:3000`) with working search/filters
- Restaurant detail loads menu/reviews/promotions

Login itself cannot complete end-to-end against real Firebase since the config is a placeholder —
this is expected. UI, validation, and error-state handling are verified instead, and this
limitation is called out explicitly rather than silently skipped.

## Out of scope for Phase 1

- iOS/web/desktop platforms
- Booking/payment, chat, favorites/waitlist/loyalty/notifications/complaints/profile screens
  (later phases)
- GPS, push notifications, camera (Phase 5)
- Real Firebase project credentials
