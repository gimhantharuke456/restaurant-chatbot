# SDD Progress

Plan: docs/superpowers/plans/2026-07-14-flutter-mobile-phase1.md
Baseline: 7008dc8
Mode: NO TESTS, NO LINT — user explicitly waived per-task unit test writing
and `flutter analyze`/`flutter test` gating for this execution. Implementers
skip any brief step that creates/modifies a `test/` file or runs
`flutter test`/`flutter analyze`. Final functional verification happens via
Task 11's manual emulator run, not per-task automated checks.

## Tasks
- [ ] Task 1: Project scaffold, dependencies, and theme
- [ ] Task 2: Core networking — ApiException + ApiClient
- [ ] Task 3: Core storage — TokenStorage
- [ ] Task 4: Auth data layer — UserModel, dummy Firebase config, AuthRepository, AuthProvider
- [ ] Task 5: Auth screens — Login & Register
- [ ] Task 6: Restaurant data layer — RestaurantModel + RestaurantRepository
- [ ] Task 7: RestaurantProvider + RestaurantCard
- [ ] Task 8: HomeScreen — search, filters, restaurant list
- [ ] Task 9: Restaurant detail data — menu, reviews, promotions + RestaurantDetailProvider
- [ ] Task 10: RestaurantDetailScreen
- [ ] Task 11: Router, bottom-nav shell, and final app wiring
