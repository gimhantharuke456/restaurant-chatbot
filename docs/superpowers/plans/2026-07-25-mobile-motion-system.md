# Mobile Motion System & UX Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a small shared motion system (`lib/core/motion/`) and apply it consistently across all 6 existing screens, plus standardize loading/empty/error states — no visual redesign, no new dependencies.

**Architecture:** `AppMotion` (durations/curves) is the single source every other motion utility and screen references. `staggeredEntrance()` and `buildPageTransition()` build on the already-present `flutter_animate` package. `SkeletonLoader` and `EmptyStateView` are new shared widgets that `LoadingView`/existing empty-state call sites migrate to, so every screen's loading/empty state looks the same.

**Tech Stack:** Flutter/Dart, `flutter_animate` (already in `pubspec.yaml`, no version change), `go_router`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-25-mobile-motion-system-design.md`.
- **No new dependencies.** Everything is built on `flutter_animate: ^4.5.2`, already present.
- **No visual/color/layout/typography changes.** Use `AppColors` constants exactly as they exist today (`lib/core/theme/app_colors.dart`) — this is a motion + interaction-polish pass only.
- **No automated tests.** Mobile still has zero test files and the user said "no tests needed" earlier this session. Verify every task with `flutter analyze`; the final task is a manual on-device handoff (per established preference this session, don't drive `flutter run`/`adb` yourself).
- Every duration/curve used anywhere in this plan comes from `AppMotion` — never a raw `300.ms`/`Duration(milliseconds: ...)` literal in a screen file.

---

### Task 1: Motion system core

**Files:**
- Create: `mobile/lib/core/motion/app_motion.dart`
- Create: `mobile/lib/core/motion/entrance.dart`
- Create: `mobile/lib/core/motion/page_transitions.dart`
- Create: `mobile/lib/core/motion/skeleton_loader.dart`

**Interfaces:**
- Consumes: `AppColors` (`mobile/lib/core/theme/app_colors.dart`), `flutter_animate`'s `.animate()`/`.shimmer()`/`.fadeIn()`/`.slideY()` extensions, `go_router`'s `GoRouterState`/`CustomTransitionPage`.
- Produces: `class AppMotion { static const fast, standard, emphasized (Duration); static const standardCurve, emphasizedCurve (Curve); }`; top-level `Widget staggeredEntrance(Widget child, {int index = 0})`; top-level `CustomTransitionPage<void> buildPageTransition({required GoRouterState state, required Widget child})`; `class SkeletonLoader extends StatelessWidget` with constructor `{double width = double.infinity, required double height, BorderRadius borderRadius = const BorderRadius.all(Radius.circular(8))}`.

- [ ] **Step 1: Write `app_motion.dart`**

```dart
import 'package:flutter/animation.dart';

/// Single source of truth for animation timing across the app — every
/// screen references these instead of hardcoding its own durations/curves.
class AppMotion {
  AppMotion._();

  static const fast = Duration(milliseconds: 150);
  static const standard = Duration(milliseconds: 250);
  static const emphasized = Duration(milliseconds: 400);

  static const standardCurve = Curves.easeOutCubic;
  static const emphasizedCurve = Curves.easeOutCubic;
}
```

- [ ] **Step 2: Write `entrance.dart`**

```dart
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'app_motion.dart';

/// Wraps [child] with a fade+slide entrance, staggered by [index] so list
/// items cascade in rather than appearing simultaneously. Delay is capped
/// at 8 items so long lists don't take forever to finish appearing.
Widget staggeredEntrance(Widget child, {int index = 0}) {
  final delay = AppMotion.fast * index.clamp(0, 8);
  return child
      .animate(delay: delay)
      .fadeIn(duration: AppMotion.standard, curve: AppMotion.standardCurve)
      .slideY(
        begin: 0.06,
        end: 0,
        duration: AppMotion.standard,
        curve: AppMotion.standardCurve,
      );
}
```

- [ ] **Step 3: Write `page_transitions.dart`**

```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'app_motion.dart';

/// A fade + slight upward slide, used for every GoRoute in app_router.dart
/// so route changes have one consistent, intentional transition instead of
/// the platform default.
CustomTransitionPage<void> buildPageTransition({
  required GoRouterState state,
  required Widget child,
}) {
  return CustomTransitionPage<void>(
    key: state.pageKey,
    child: child,
    transitionDuration: AppMotion.standard,
    reverseTransitionDuration: AppMotion.standard,
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      final curved = CurvedAnimation(parent: animation, curve: AppMotion.standardCurve);
      return FadeTransition(
        opacity: curved,
        child: SlideTransition(
          position: Tween<Offset>(begin: const Offset(0, 0.04), end: Offset.zero)
              .animate(curved),
          child: child,
        ),
      );
    },
  );
}
```

- [ ] **Step 4: Write `skeleton_loader.dart`**

```dart
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../theme/app_colors.dart';

/// A shimmering placeholder box shown while content is loading. Shape it to
/// roughly match the content that's about to appear via [width]/[height]/
/// [borderRadius] at the call site.
class SkeletonLoader extends StatelessWidget {
  final double width;
  final double height;
  final BorderRadius borderRadius;

  const SkeletonLoader({
    super.key,
    this.width = double.infinity,
    required this.height,
    this.borderRadius = const BorderRadius.all(Radius.circular(8)),
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(color: AppColors.muted, borderRadius: borderRadius),
    ).animate(onPlay: (controller) => controller.repeat()).shimmer(
          duration: const Duration(milliseconds: 1200),
          color: AppColors.accent.withValues(alpha: 0.4),
        );
  }
}
```

- [ ] **Step 5: Verify**

Run: `cd mobile && flutter analyze`
Expected: no new issues (only the pre-existing `app_router.dart:1:8` unused-import warning, if still present).

- [ ] **Step 6: Commit**

```bash
cd mobile
git add lib/core/motion
git commit -m "feat(mobile): add shared motion system (AppMotion, staggered entrance, page transitions, skeleton loader)"
```

---

### Task 2: `EmptyStateView` shared widget

**Files:**
- Create: `mobile/lib/shared/widgets/empty_state_view.dart`
- Modify: `mobile/lib/features/chat/screens/chat_screen.dart`
- Modify: `mobile/lib/features/restaurants/screens/home_screen.dart`
- Modify: `mobile/lib/features/booking/widgets/booking_menu_cart_step.dart`

**Interfaces:**
- Consumes: `AppColors`.
- Produces: `class EmptyStateView extends StatelessWidget` with constructor `{required IconData icon, required String title, required String subtitle, Widget? child}`.

- [ ] **Step 1: Write `empty_state_view.dart`**

```dart
import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

/// Shared icon + heading + subtext layout for "nothing here" states, with
/// an optional trailing [child] slot (e.g. chat's suggested prompts).
class EmptyStateView extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Widget? child;

  const EmptyStateView({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(color: AppColors.muted, borderRadius: BorderRadius.circular(16)),
              child: Icon(icon, color: AppColors.mutedForeground, size: 28),
            ),
            const SizedBox(height: 16),
            Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
            const SizedBox(height: 4),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.mutedForeground, fontSize: 13),
            ),
            if (child != null) ...[
              const SizedBox(height: 20),
              child!,
            ],
          ],
        ),
      ),
    );
  }
}
```

- [ ] **Step 2: Refactor chat's empty state to use it**

In `chat_screen.dart`, add the import:
```dart
import '../../../shared/widgets/empty_state_view.dart';
```

Replace the entire `_EmptyState` class with:
```dart
class _EmptyState extends StatelessWidget {
  final ValueChanged<String> onPromptSelected;

  const _EmptyState({required this.onPromptSelected});

  @override
  Widget build(BuildContext context) {
    return EmptyStateView(
      icon: Icons.restaurant_menu,
      title: 'What can I help you with?',
      subtitle: 'Discover restaurants, get personalised recommendations, or book a table.',
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: _suggestedPrompts
            .map((prompt) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: () => onPromptSelected(prompt),
                      style: OutlinedButton.styleFrom(alignment: Alignment.centerLeft),
                      child: Text(prompt, textAlign: TextAlign.left),
                    ),
                  ),
                ))
            .toList(),
      ),
    );
  }
}
```

- [ ] **Step 3: Use it for the home screen's empty state**

In `home_screen.dart`, add the import:
```dart
import '../../../shared/widgets/empty_state_view.dart';
```

Replace:
```dart
              if (restaurantProvider.restaurants.isEmpty) {
                return const Center(child: Text('No restaurants found'));
              }
```
with:
```dart
              if (restaurantProvider.restaurants.isEmpty) {
                return const EmptyStateView(
                  icon: Icons.search_off,
                  title: 'No restaurants found',
                  subtitle: 'Try adjusting your search or filters.',
                );
              }
```

- [ ] **Step 4: Use it for the booking menu step's empty state**

In `booking_menu_cart_step.dart`, add the import:
```dart
import '../../../shared/widgets/empty_state_view.dart';
```

Replace:
```dart
    if (menuItems.isEmpty) {
      return const Center(child: Text('No menu items available'));
    }
```
with:
```dart
    if (menuItems.isEmpty) {
      return const EmptyStateView(
        icon: Icons.restaurant_menu,
        title: 'No menu items available',
        subtitle: "This restaurant hasn't added a menu yet.",
      );
    }
```

- [ ] **Step 5: Verify**

Run: `cd mobile && flutter analyze`
Expected: no new issues.

- [ ] **Step 6: Commit**

```bash
cd mobile
git add lib/shared/widgets/empty_state_view.dart lib/features/chat/screens/chat_screen.dart lib/features/restaurants/screens/home_screen.dart lib/features/booking/widgets/booking_menu_cart_step.dart
git commit -m "feat(mobile): add shared EmptyStateView, apply to chat/home/booking-menu empty states"
```

---

### Task 3: Skeleton loading + fade-in error state

**Files:**
- Modify: `mobile/lib/shared/widgets/loading_view.dart`
- Modify: `mobile/lib/shared/widgets/error_retry_view.dart`
- Modify: `mobile/lib/features/booking/widgets/booking_menu_cart_step.dart`
- Modify: `mobile/lib/features/booking/widgets/booking_date_time_step.dart`

**Interfaces:**
- Consumes: `SkeletonLoader`, `AppMotion` (Task 1).
- Produces: `LoadingView` now renders a skeleton list instead of a bare spinner (same name/usage at every existing call site — no call-site changes needed for `LoadingView` itself); `ErrorRetryView` fades in.

- [ ] **Step 1: Rewrite `loading_view.dart`**

```dart
import 'package:flutter/material.dart';
import '../../core/motion/skeleton_loader.dart';

class LoadingView extends StatelessWidget {
  const LoadingView({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 5,
      itemBuilder: (context, index) => const Padding(
        padding: EdgeInsets.only(bottom: 12),
        child: SkeletonLoader(height: 88, borderRadius: BorderRadius.all(Radius.circular(14))),
      ),
    );
  }
}
```

- [ ] **Step 2: Rewrite `error_retry_view.dart`**

```dart
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../core/motion/app_motion.dart';

class ErrorRetryView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const ErrorRetryView({super.key, required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            ElevatedButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    ).animate().fadeIn(duration: AppMotion.standard, curve: AppMotion.standardCurve);
  }
}
```

- [ ] **Step 3: Replace the booking menu step's inline spinner with `LoadingView`**

In `booking_menu_cart_step.dart`, add the import:
```dart
import '../../../shared/widgets/loading_view.dart';
```

Replace:
```dart
    if (loadingMenu) {
      return const Center(child: CircularProgressIndicator());
    }
```
with:
```dart
    if (loadingMenu) {
      return const LoadingView();
    }
```

- [ ] **Step 4: Replace the booking date/time step's slot-loading indicator with skeleton chips**

In `booking_date_time_step.dart`, add the import:
```dart
import '../../../core/motion/skeleton_loader.dart';
```

Replace:
```dart
        if (loadingSlots)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 8),
            child: LinearProgressIndicator(),
          )
```
with:
```dart
        if (loadingSlots)
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: List.generate(
              6,
              (_) => const SkeletonLoader(
                width: 64,
                height: 32,
                borderRadius: BorderRadius.all(Radius.circular(20)),
              ),
            ),
          )
```

- [ ] **Step 5: Verify**

Run: `cd mobile && flutter analyze`
Expected: no new issues.

- [ ] **Step 6: Commit**

```bash
cd mobile
git add lib/shared/widgets/loading_view.dart lib/shared/widgets/error_retry_view.dart lib/features/booking/widgets/booking_menu_cart_step.dart lib/features/booking/widgets/booking_date_time_step.dart
git commit -m "feat(mobile): standardize loading states on SkeletonLoader, fade in ErrorRetryView"
```

---

### Task 4: Staggered entrance for the home screen's restaurant list

**Files:**
- Modify: `mobile/lib/features/restaurants/widgets/restaurant_card.dart`
- Modify: `mobile/lib/features/restaurants/screens/home_screen.dart`

**Interfaces:**
- Consumes: `staggeredEntrance` (Task 1).
- Produces: `RestaurantCard` constructor gains `{this.index = 0}`.

- [ ] **Step 1: Update `restaurant_card.dart`**

Replace:
```dart
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../../core/theme/app_colors.dart';
import '../models/restaurant_model.dart';

class RestaurantCard extends StatelessWidget {
  final RestaurantModel restaurant;
  final VoidCallback onTap;

  const RestaurantCard({super.key, required this.restaurant, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
```
with:
```dart
import 'package:flutter/material.dart';
import '../../../core/motion/entrance.dart';
import '../../../core/theme/app_colors.dart';
import '../models/restaurant_model.dart';

class RestaurantCard extends StatelessWidget {
  final RestaurantModel restaurant;
  final VoidCallback onTap;
  final int index;

  const RestaurantCard({
    super.key,
    required this.restaurant,
    required this.onTap,
    this.index = 0,
  });

  @override
  Widget build(BuildContext context) {
    return staggeredEntrance(
      _buildCard(context),
      index: index,
    );
  }

  Widget _buildCard(BuildContext context) {
    return Card(
```

Then, at the very end of the file, replace:
```dart
    ).animate().fadeIn(duration: 300.ms).slideY(begin: 0.06, end: 0);
  }
}
```
with:
```dart
    );
  }
}
```

(This wraps the existing `Card(...)` body — which is unchanged — in a new
`_buildCard` method, and moves the entrance animation to the shared
`staggeredEntrance` helper instead of a hardcoded `300.ms`/`0.06` one-off.)

- [ ] **Step 2: Pass the index through in `home_screen.dart`**

Replace:
```dart
                  return RestaurantCard(
                    restaurant: restaurant,
                    onTap: () => context.push('/restaurants/${restaurant.id}'),
                  );
```
with:
```dart
                  return RestaurantCard(
                    restaurant: restaurant,
                    onTap: () => context.push('/restaurants/${restaurant.id}'),
                    index: index,
                  );
```

- [ ] **Step 3: Verify**

Run: `cd mobile && flutter analyze`
Expected: no new issues.

- [ ] **Step 4: Commit**

```bash
cd mobile
git add lib/features/restaurants/widgets/restaurant_card.dart lib/features/restaurants/screens/home_screen.dart
git commit -m "feat(mobile): stagger restaurant card entrance instead of animating all at once"
```

---

### Task 6: Chat message entrance animation

**Files:**
- Modify: `mobile/lib/features/chat/widgets/chat_message_bubble.dart`
- Modify: `mobile/lib/features/chat/screens/chat_screen.dart`

**Interfaces:**
- Consumes: `staggeredEntrance` (Task 1).
- Produces: no signature change to `ChatMessageBubble` — its `build()` method now wraps its return value in `staggeredEntrance`.

- [ ] **Step 1: Wrap `ChatMessageBubble`'s output in the entrance animation**

In `chat_message_bubble.dart`, add the import:
```dart
import '../../../core/motion/entrance.dart';
```

Change:
```dart
  @override
  Widget build(BuildContext context) {
    final isRestaurantList = message.content == _restaurantListSentinel &&
        message.data != null &&
        message.data!.isNotEmpty;

    if (isRestaurantList) {
```
to:
```dart
  @override
  Widget build(BuildContext context) {
    return staggeredEntrance(_buildContent(context));
  }

  Widget _buildContent(BuildContext context) {
    final isRestaurantList = message.content == _restaurantListSentinel &&
        message.data != null &&
        message.data!.isNotEmpty;

    if (isRestaurantList) {
```

(Everything after this point in the file — the `isRestaurantList` branch and
the final message `Row` — is unchanged; it's now the body of `_buildContent`
instead of `build`.)

- [ ] **Step 2: Give each list item a stable key in `chat_screen.dart`**

This isn't strictly required for correctness (chat's message list only ever
grows by appending or fully resets via `clearConversation()`, so
position-based widget reuse already keeps each bubble's animation state
intact across rebuilds — a newly-appended message is a genuinely new widget
at a new index and will play its entrance; existing ones at unchanged
positions won't replay theirs). Adding an explicit key is a cheap
defensive-correctness improitem regardless. Replace:
```dart
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: ChatMessageBubble(message: chat.messages[index]),
                      );
```
with:
```dart
                      return Padding(
                        key: ValueKey(chat.messages[index].id),
                        padding: const EdgeInsets.only(bottom: 12),
                        child: ChatMessageBubble(message: chat.messages[index]),
                      );
```

- [ ] **Step 3: Verify**

Run: `cd mobile && flutter analyze`
Expected: no new issues.

- [ ] **Step 4: Commit**

```bash
cd mobile
git add lib/features/chat/widgets/chat_message_bubble.dart lib/features/chat/screens/chat_screen.dart
git commit -m "feat(mobile): animate chat message bubbles in as they're appended"
```

---

### Task 7: Booking flow step transitions + success animation

**Files:**
- Modify: `mobile/lib/features/booking/screens/booking_flow_screen.dart`

**Interfaces:**
- Consumes: `AppMotion` (Task 1).
- Produces: no public API change — internal presentation only.

- [ ] **Step 1: Add imports**

```dart
import 'package:flutter_animate/flutter_animate.dart';
import '../../../core/motion/app_motion.dart';
```

- [ ] **Step 2: Wrap the step switch in `AnimatedSwitcher`**

Replace:
```dart
      body: Builder(builder: (context) {
        switch (_step) {
          case 1:
            return BookingDateTimeStep(
```
with:
```dart
      body: AnimatedSwitcher(
        duration: AppMotion.standard,
        transitionBuilder: (child, animation) {
          final curved = CurvedAnimation(parent: animation, curve: AppMotion.standardCurve);
          return FadeTransition(
            opacity: curved,
            child: SlideTransition(
              position: Tween<Offset>(begin: const Offset(0.05, 0), end: Offset.zero)
                  .animate(curved),
              child: child,
            ),
          );
        },
        child: KeyedSubtree(
          key: ValueKey(_step),
          child: Builder(builder: (context) {
            switch (_step) {
              case 1:
                return BookingDateTimeStep(
```

Then find the matching closing braces at the end of the `body:` value —
replace:
```dart
        }
      }),
    );
  }
}
```
with:
```dart
              }
            }),
          ),
        ),
      );
  }
}
```

Note the indentation of the three step-return blocks (`BookingDateTimeStep`,
`BookingMenuCartStep`, and the `default:` `BookingReviewPayStep`) each need
one extra level of nesting now that they're inside the added
`KeyedSubtree`/`Builder`. Re-indent them for readability, but this is
cosmetic — Dart doesn't care about whitespace.

- [ ] **Step 3: Add a success checkmark animation, replacing the `SnackBar`**

Add this method to `_BookingFlowScreenState`, above `build`:
```dart
  Future<void> _showSuccessAndPop() async {
    if (!mounted) return;
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.black54,
      builder: (dialogContext) {
        Future.delayed(const Duration(milliseconds: 800), () {
          if (dialogContext.mounted) Navigator.of(dialogContext).pop();
        });
        return Center(
          child: const Icon(Icons.check_circle, color: Colors.green, size: 96)
              .animate()
              .scale(duration: AppMotion.standard, curve: Curves.elasticOut)
              .fadeIn(duration: AppMotion.fast),
        );
      },
    );
    if (!mounted) return;
    Navigator.of(context).pop();
  }
```

Replace, inside `_pay()`:
```dart
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Payment successful! Your table is booked.')),
    );
    Navigator.of(context).pop();
```
with:
```dart
    await _showSuccessAndPop();
```

- [ ] **Step 4: Verify**

Run: `cd mobile && flutter analyze`
Expected: no new issues.

- [ ] **Step 5: Commit**

```bash
cd mobile
git add lib/features/booking/screens/booking_flow_screen.dart
git commit -m "feat(mobile): animate booking step transitions and add a success checkmark"
```

---

### Task 8: Auth screen entrance consistency

**Files:**
- Modify: `mobile/lib/features/auth/screens/login_screen.dart`
- Modify: `mobile/lib/features/auth/screens/register_screen.dart`

**Interfaces:**
- Consumes: `AppMotion` (Task 1).
- Produces: no public API change.

- [ ] **Step 1: Migrate `login_screen.dart` off its hardcoded duration**

Add the import:
```dart
import '../../../core/motion/app_motion.dart';
```

Replace:
```dart
            ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.08, end: 0),
```
with:
```dart
            ).animate().fadeIn(duration: AppMotion.emphasized, curve: AppMotion.emphasizedCurve)
                .slideY(begin: 0.08, end: 0, duration: AppMotion.emphasized, curve: AppMotion.emphasizedCurve),
```

- [ ] **Step 2: Give `register_screen.dart` the same entrance treatment**

Add the imports:
```dart
import 'package:flutter_animate/flutter_animate.dart';
import '../../../core/motion/app_motion.dart';
```

Replace the closing of the `Form`'s child `Column` — currently:
```dart
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
```
with:
```dart
                ],
              ),
            ).animate().fadeIn(duration: AppMotion.emphasized, curve: AppMotion.emphasizedCurve)
                .slideY(begin: 0.08, end: 0, duration: AppMotion.emphasized, curve: AppMotion.emphasizedCurve),
          ),
        ),
      ),
    );
  }
}
```

(This mirrors `login_screen.dart`'s exact treatment — same durations, same
slide offset — so the two auth screens feel identical.)

- [ ] **Step 3: Verify**

Run: `cd mobile && flutter analyze`
Expected: no new issues.

- [ ] **Step 4: Commit**

```bash
cd mobile
git add lib/features/auth/screens/login_screen.dart lib/features/auth/screens/register_screen.dart
git commit -m "feat(mobile): give RegisterScreen the same entrance animation as LoginScreen"
```

---

### Task 9: Consistent page transitions across every route

**Files:**
- Modify: `mobile/lib/core/router/app_router.dart`

**Interfaces:**
- Consumes: `buildPageTransition` (Task 1).
- Produces: no change to route paths/behavior — only the transition when navigating to them.

- [ ] **Step 1: Add the import**

```dart
import '../motion/page_transitions.dart';
```

- [ ] **Step 2: Convert every `GoRoute`'s `builder:` to `pageBuilder:`**

Replace the entire `routes:` list with:
```dart
    routes: [
      GoRoute(
        path: '/login',
        pageBuilder: (context, state) => buildPageTransition(state: state, child: const LoginScreen()),
      ),
      GoRoute(
        path: '/register',
        pageBuilder: (context, state) => buildPageTransition(state: state, child: const RegisterScreen()),
      ),
      ShellRoute(
        builder: (context, state, child) => AppShell(location: state.matchedLocation, child: child),
        routes: [
          GoRoute(
            path: '/home',
            pageBuilder: (context, state) => buildPageTransition(state: state, child: const HomeScreen()),
          ),
          GoRoute(
            path: '/reservations',
            pageBuilder: (context, state) =>
                buildPageTransition(state: state, child: const ComingSoonScreen(title: 'Reservations')),
          ),
          GoRoute(
            path: '/chat',
            pageBuilder: (context, state) => buildPageTransition(state: state, child: const ChatScreen()),
          ),
          GoRoute(
            path: '/more',
            pageBuilder: (context, state) =>
                buildPageTransition(state: state, child: const ComingSoonScreen(title: 'More')),
          ),
        ],
      ),
      GoRoute(
        path: '/restaurants/:id',
        pageBuilder: (context, state) => buildPageTransition(
          state: state,
          child: ChangeNotifierProvider(
            create: (_) => RestaurantDetailProvider(context.read<RestaurantRepository>()),
            child: RestaurantDetailScreen(restaurantId: state.pathParameters['id']!),
          ),
        ),
      ),
      GoRoute(
        path: '/restaurants/:id/book',
        pageBuilder: (context, state) => buildPageTransition(
          state: state,
          child: BookingFlowScreen(restaurantId: state.pathParameters['id']!),
        ),
      ),
    ],
```

(Note: the `ShellRoute` itself keeps its plain `builder:` — that's the shell
UI wrapper, not a navigable page; only its child `GoRoute`s get
`pageBuilder`.)

- [ ] **Step 3: Verify**

Run: `cd mobile && flutter analyze`
Expected: no new issues. This is also a good moment to run a real build,
since route configuration errors can sometimes only surface at runtime:

Run: `cd mobile && flutter build apk --debug`
Expected: `✓ Built build/app/outputs/flutter-apk/app-debug.apk`.

- [ ] **Step 4: Commit**

```bash
cd mobile
git add lib/core/router/app_router.dart
git commit -m "feat(mobile): apply consistent fade/slide page transitions to every route"
```

---

### Task 10: Final verification pass

No new files — a whole-project sanity check plus a manual on-device
handoff, replacing an automated test pass (see Global Constraints).

- [ ] **Step 1: Full project analyze**

Run: `cd mobile && flutter analyze`
Expected: no new issues anywhere in the project (only the pre-existing
`app_router.dart` unused-import warning, if it's still present — check
whether Task 9's rewrite of that file happened to remove the need for the
`material.dart` import; if the warning is gone, that's a welcome side
effect, not a problem).

- [ ] **Step 2: Full debug build**

Run: `cd mobile && flutter build apk --debug`
Expected: `✓ Built build/app/outputs/flutter-apk/app-debug.apk`.

- [ ] **Step 3: Hand off for manual verification**

Report back to the user with:
```
cd mobile
flutter run -d <device-id> --dart-define=API_BASE_URL=http://<host-lan-ip>:3000/api
```
Ask them to check: home screen's restaurant cards cascade in rather than
popping in together; navigating between any two screens shows a fade/slide
instead of an instant cut; chat messages fade in as they arrive; the
booking flow's 3 steps transition smoothly instead of cutting; a successful
test payment shows the checkmark animation before returning to the
restaurant page; loading states everywhere show the shimmering skeleton
instead of a bare spinner; empty states (no restaurants found, no menu
items) show the icon+text treatment instead of plain text.
