# SDD Progress

Plan: docs/superpowers/plans/2026-07-14-flutter-mobile-phase1.md
Baseline: 7008dc8
Mode: NO TESTS, NO LINT — user explicitly waived per-task unit test writing
and `flutter analyze`/`flutter test` gating for this execution. Implementers
skip any brief step that creates/modifies a `test/` file or runs
`flutter test`/`flutter analyze`. Final functional verification happens via
Task 11's manual emulator run, not per-task automated checks.

## Tasks
- [x] Task 1: Project scaffold, dependencies, and theme (commits 7008dc8..55aa93f, review clean)
- [x] Task 2: Core networking — ApiException + ApiClient (commit b09b26c, review clean)
- [x] Task 3: Core storage — TokenStorage (commit 27d82d2, review clean)
- [x] Task 4: Auth data layer — UserModel, dummy Firebase config, AuthRepository, AuthProvider (commit d40e217, review clean)
- [x] Task 5: Auth screens — Login & Register (commit 4afbcd2, review clean)
- [x] Task 6: Restaurant data layer — RestaurantModel + RestaurantRepository (commit a2df568, review clean)
- [x] Task 7: RestaurantProvider + RestaurantCard (commit 70c274a, review clean)
- [x] Task 8: HomeScreen — search, filters, restaurant list (commit 686f90e, review clean)
- [x] Task 9: Restaurant detail data — menu, reviews, promotions + RestaurantDetailProvider (commit 6b77c15, review clean)
- [x] Task 10: RestaurantDetailScreen (commit 10e3cdc, review clean)
- [x] Task 11: Router, bottom-nav shell, and final app wiring (commit 447b69d + fix fbdebdd for GoRouter-rebuild bug, review clean)

## Post-11: final whole-branch review + fixes

- [x] Final whole-branch review (opus) — "With fixes": minSdk + global 401 handler
- [x] Fix commit 3aa126e (minSdk=23, ApiClient.onUnauthorized wired to authProvider.signOut) — review clean

ALL 11 TASKS + FINAL REVIEW COMPLETE. Plan: docs/superpowers/plans/2026-07-14-flutter-mobile-phase1.md
