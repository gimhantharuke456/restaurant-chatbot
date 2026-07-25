# Mobile Motion System & UX Polish — Design

## Goal

The Flutter app currently has almost no animation or interaction polish: only
2 of its files use any animation at all (`restaurant_card.dart`'s fade-in and
`login_screen.dart`'s fade-in), route transitions are Flutter's unmodified
default, and loading/empty/error states are inconsistent across screens (some
inline, some via shared widgets, several unstyled). Build one small reusable
motion system and apply it consistently across every existing screen, plus
standardize loading/empty/error states — without changing the app's visual
language (colors, layout, typography stay as they are).

## Scope decisions (confirmed with user)

1. **Whole app, systematically** — not just the newest flows (chat, booking).
   One cohesive pass across all 6 screens.
2. **"Animation engine" = a shared motion system**: one place defining
   durations/curves plus a handful of reusable animated widgets that every
   screen pulls from — not a custom orchestration/timeline engine, not
   Lottie/Rive, not physics simulation.
3. **Stay within the current visual look.** No color/layout/typography
   changes. Scope is motion + non-visual interaction polish (loading/empty/
   error state consistency, spacing/feedback where something looks
   unfinished).

## Current state (found during exploration)

- `pubspec.yaml` already has `flutter_animate: ^4.5.2` — no new dependency
  needed.
- Only usages: `restaurant_card.dart` (`.animate().fadeIn(duration: 300.ms)
  .slideY(begin: 0.06, end: 0)`, no per-index delay — every card in the list
  fades in **simultaneously**, not as a cascade) and `login_screen.dart`
  (`.animate().fadeIn(duration: 400.ms).slideY(begin: 0.08, end: 0)`).
- `register_screen.dart` has **no** entrance animation at all — inconsistent
  with `login_screen.dart` despite being the sibling auth screen.
- All `GoRoute`/`ShellRoute` entries in `app_router.dart` use default
  `builder:`, meaning platform-default page transitions everywhere.
- `booking_flow_screen.dart`'s step switch (`Builder` + `switch (_step)`)
  swaps step 1/2/3 content with **zero transition** — an instant, jarring
  cut between date/time, menu, and review screens.
- Shared state widgets: `lib/shared/widgets/loading_view.dart` (bare
  `CircularProgressIndicator`) and `error_retry_view.dart` (plain text +
  button, no entrance animation). Not universally used — e.g.
  `booking_menu_cart_step.dart` has its own inline
  `Center(child: CircularProgressIndicator())` instead of `LoadingView`, and
  `booking_date_time_step.dart` uses a bare `LinearProgressIndicator` for
  slot loading. Several empty states (`home_screen.dart`'s "No restaurants
  found", `booking_menu_cart_step.dart`'s "No menu items available") are
  plain unstyled `Text`, unlike chat's icon+text empty state which already
  looks intentional.
- Chat's typing indicator (`chat_typing_indicator.dart`) already animates
  (bouncing dots via `AnimationController`) — left as-is, it's already good.

## Architecture

New `lib/core/motion/` module:

```
lib/core/motion/
  app_motion.dart        # durations + curves vocabulary
  entrance.dart          # staggered fade-slide-in helper for lists
  page_transitions.dart  # CustomTransitionPage builder for GoRouter
  skeleton_loader.dart   # shimmer/pulse loading placeholder widget
```

- `AppMotion`: `static const fast = Duration(milliseconds: 150)`, `standard =
  250ms`, `emphasized = 400ms`; `static const standardCurve = Curves.
  easeOutCubic`, `emphasizedCurve = Curves.easeOutCubic` (kept identical to
  standard for now — no need to invent a second curve without a concrete use,
  YAGNI). Existing one-off `.animate()` calls in `restaurant_card.dart` and
  `login_screen.dart` get updated to reference `AppMotion` constants instead
  of their own hardcoded numbers, so all three converge on one vocabulary.
- Staggered entrance: a small extension/helper (building on the existing
  `flutter_animate` package, not a new widget class) that takes an item's
  list index and returns a fade+slideY animation with `delay: AppMotion.fast
  * index` (capped, e.g. `min(index, 8)`, so a 50-item list doesn't take
  forever to finish appearing). Applied to `restaurant_card.dart` (home
  screen list) and chat message bubbles.
- Page transitions: a `buildPageTransition` helper wrapping `CustomTransitionPage`
  with a fade + slight upward slide (`AppMotion.standard`), applied to every
  `GoRoute`/`ShellRoute` entry in `app_router.dart` via `pageBuilder:` instead
  of `builder:`.
- Skeleton loader: a `SkeletonLoader` widget — a shimmering placeholder box
  (opacity pulse between two `AppColors.muted`-based shades, looping) used
  wherever content is loading. Replaces `LoadingView`'s internals (same
  widget name/usage everywhere it's already called — `LoadingView` becomes
  a thin wrapper around a few `SkeletonLoader` boxes shaped like the content
  that's about to appear, e.g. card-shaped placeholders on the home screen).
  `booking_menu_cart_step.dart` and `booking_date_time_step.dart`'s inline
  spinners are replaced with the same `SkeletonLoader`, so all three loading
  states look the same.

## Applying it to each screen

- **Home screen** (`home_screen.dart` / `restaurant_card.dart`): cards use
  the staggered entrance helper (cascading in) instead of simultaneous
  fade-in. `LoadingView` (already used here) automatically picks up the
  skeleton treatment. Empty state ("No restaurants found") gets the same
  icon+text treatment as chat's empty state, not a bare `Text`.
- **Restaurant detail** (`restaurant_detail_screen.dart`): once
  `RestaurantDetailProvider` finishes loading, the content `ListView` fades
  in (`AppMotion.standard`) instead of popping in abruptly. `LoadingView` and
  `ErrorRetryView` usages here get the same skeleton/fade treatment
  automatically since those are shared widgets.
- **Chat** (`chat_message_bubble.dart` / `chat_screen.dart`): each new
  message bubble (both the plain-text/markdown case and the restaurant-list
  case) animates in with the staggered entrance helper when it's appended to
  the list. Typing indicator is untouched (already animated).
- **Booking flow** (`booking_flow_screen.dart` and its 3 step widgets): the
  `switch (_step)` body gets wrapped in `AnimatedSwitcher` (`AppMotion.
  standard`, fade+slide transition) so moving between date/time → menu/cart
  → review isn't an instant cut. `booking_date_time_step.dart`'s slot-loading
  `LinearProgressIndicator` and `booking_menu_cart_step.dart`'s inline
  `CircularProgressIndicator` are both replaced with `SkeletonLoader`. After
  a successful payment, replace the plain `SnackBar` in
  `booking_flow_screen.dart`'s `_pay()` with a brief animated checkmark
  confirmation (a small `AnimatedScale`/`AnimatedOpacity` check-circle shown
  full-screen for ~800ms) before popping back — the `SnackBar` call is
  removed, not kept alongside it.
- **Auth** (`register_screen.dart`): gets the same fade-slide entrance
  `login_screen.dart` already has, for parity — copy the exact same
  `AppMotion`-based treatment, no new pattern invented.

## Loading/empty/error consistency

- `LoadingView` and the new `SkeletonLoader` become the **only** loading
  treatment used anywhere — the two inline spinners in the booking step
  widgets are removed in favor of it.
- `ErrorRetryView` gets a fade-in entrance (`AppMotion.standard`) instead of
  appearing instantly; no other behavior change (still just message + retry
  button).
- Empty states across the app (home screen's "No restaurants found",
  booking menu's "No menu items available") get upgraded to match chat's
  existing icon + heading + subtext pattern, reusing that same layout rather
  than inventing a new one.

## Out of scope

- No visual/color/typography/layout redesign — confirmed with user.
- No new dependencies — everything builds on `flutter_animate`, already
  present.
- No changes to business logic, API calls, or state management in any
  screen — this is purely presentational.
- No custom curve beyond `standardCurve`/`emphasizedCurve` unless a concrete
  screen needs visibly different motion — avoiding inventing unused options.
