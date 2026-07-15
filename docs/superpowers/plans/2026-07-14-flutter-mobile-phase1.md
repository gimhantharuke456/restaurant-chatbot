# Flutter Mobile App — Phase 1 (Foundation & Discovery) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a new Flutter (Android-only) app that clones the customer-facing web app's foundation — theme, auth (dummy Firebase config), navigation shell, restaurant discovery, and restaurant detail — as a working, testable vertical slice.

**Architecture:** Provider-based state management (`ChangeNotifier` + `MultiProvider`), a thin `http`-backed `ApiClient` talking directly to the existing Express backend, `go_router` for navigation with auth-guarded redirects, and a repository pattern (`AuthRepository`, `RestaurantRepository`) so providers are unit-testable against fakes without touching Firebase or the network.

**Tech Stack:** Flutter 3.41 / Dart 3.11, `provider`, `http`, `go_router`, `firebase_core` + `firebase_auth` (dummy config), `flutter_secure_storage`, `flutter_animate`.

## Global Constraints

- Target platform: **Android only**. No iOS/web/desktop platform folders.
- State management: **Provider**, not Riverpod/Bloc/GetX.
- Networking: **`http` package**, not `dio`.
- Firebase: **dummy placeholder config** for now (`DummyFirebaseOptions.android`) — real sign-in will not complete against Google's servers until real project credentials replace it. This is expected, not a bug.
- Theme: the "AgentDine Dark Orange" palette, always dark, cloned from `frontend/src/app/globals.css` — background `#0F1419`→`#1A1A2E`, primary `#FF6B35`, card `#16202F`, foreground `#FFFFFF`, destructive `#EF4444`, border `rgba(255,140,66,0.2)`.
- Dev backend URL: Android emulator reaches the host's `localhost:3000` via `10.0.2.2`. Default base URL: `http://10.0.2.2:3000/api`, overridable via `--dart-define=API_BASE_URL=...`.
- Scope: customer-facing app only. This plan covers Phase 1 (foundation, auth, home/discovery, restaurant detail). Booking/payment, chat, favorites/waitlist/loyalty/notifications/complaints/profile, and native features (GPS/push/camera) are later phases — out of scope here.
- Auth in Phase 1 is **email/password only**. The spec's "Google sign-in button" is deferred: it requires a real Firebase project (SHA-1 fingerprint registration, OAuth client) that cannot work with a dummy config, and shipping a dead button would be worse than omitting it. Re-added once real Firebase credentials exist.
- Deviation is called out explicitly wherever this plan diverges from `docs/superpowers/specs/2026-07-14-flutter-mobile-app-design.md`.

## Project location

All Flutter code lives in a new top-level `mobile/` directory (sibling to `frontend/`, `backend/`, `ai-service/`), created in Task 1 via `flutter create`.

---

### Task 1: Project scaffold, dependencies, and theme

**Files:**
- Create: `mobile/` (via `flutter create`)
- Create: `mobile/lib/core/theme/app_colors.dart`
- Create: `mobile/lib/core/theme/app_theme.dart`
- Modify: `mobile/lib/main.dart`
- Delete: `mobile/test/widget_test.dart` (default counter-app test, references code we're replacing)
- Test: `mobile/test/core/theme/app_theme_test.dart`

**Interfaces:**
- Produces: `AppColors` (static `Color` constants), `AppTheme.dark` (a `ThemeData` getter) — consumed by every screen task from here on.

- [ ] **Step 1: Scaffold the Flutter project**

Run from the repo root:

```bash
flutter create --platforms=android --org com.restaurantchatbot --project-name restaurant_chatbot_mobile mobile
```

Expected: a `mobile/` directory is created with the standard Flutter project layout (`lib/`, `android/`, `test/`, `pubspec.yaml`).

- [ ] **Step 2: Remove the default counter-app test**

```bash
rm mobile/test/widget_test.dart
```

This file references the default `MyApp` counter widget, which Step 7 replaces.

- [ ] **Step 3: Write the failing theme test**

Create `mobile/test/core/theme/app_theme_test.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:restaurant_chatbot_mobile/core/theme/app_colors.dart';
import 'package:restaurant_chatbot_mobile/core/theme/app_theme.dart';

void main() {
  group('AppTheme', () {
    test('dark theme uses the AgentDine palette', () {
      final theme = AppTheme.dark;

      expect(theme.brightness, Brightness.dark);
      expect(theme.scaffoldBackgroundColor, AppColors.background);
      expect(theme.colorScheme.primary, AppColors.primary);
      expect(theme.colorScheme.surface, AppColors.card);
      expect(theme.colorScheme.error, AppColors.destructive);
    });
  });
}
```

- [ ] **Step 4: Run the test and verify it fails**

```bash
cd mobile && flutter test test/core/theme/app_theme_test.dart
```

Expected: FAIL — `Target of URI doesn't exist: 'package:restaurant_chatbot_mobile/core/theme/app_theme.dart'`.

- [ ] **Step 5: Implement AppColors**

Create `mobile/lib/core/theme/app_colors.dart`:

```dart
import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  static const background = Color(0xFF0F1419);
  static const backgroundGradientEnd = Color(0xFF1A1A2E);
  static const foreground = Color(0xFFFFFFFF);
  static const card = Color(0xFF16202F);
  static const primary = Color(0xFFFF6B35);
  static const secondary = Color(0xFF1A1F2E);
  static const secondaryForeground = Color(0xFFF1F5F9);
  static const muted = Color(0xFF1A1F2E);
  static const mutedForeground = Color(0xFFB0B8C1);
  static const accent = Color(0xFF252F40);
  static const destructive = Color(0xFFEF4444);
  static const border = Color(0x33FF8C42);
}
```

- [ ] **Step 6: Implement AppTheme**

Create `mobile/lib/core/theme/app_theme.dart`:

```dart
import 'package:flutter/material.dart';
import 'app_colors.dart';

class AppTheme {
  AppTheme._();

  static ThemeData get dark {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppColors.background,
      primaryColor: AppColors.primary,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.primary,
        onPrimary: AppColors.foreground,
        secondary: AppColors.secondary,
        onSecondary: AppColors.secondaryForeground,
        surface: AppColors.card,
        onSurface: AppColors.foreground,
        error: AppColors.destructive,
        onError: AppColors.foreground,
      ),
      cardColor: AppColors.card,
      dividerColor: AppColors.border,
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.foreground,
        elevation: 0,
      ),
      textTheme: const TextTheme(
        bodyLarge: TextStyle(color: AppColors.foreground),
        bodyMedium: TextStyle(color: AppColors.foreground),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.secondary,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppColors.border),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: AppColors.foreground,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      ),
    );
  }
}
```

- [ ] **Step 7: Run the test and verify it passes**

```bash
flutter test test/core/theme/app_theme_test.dart
```

Expected: PASS (1 test).

- [ ] **Step 8: Wire the theme into main.dart**

Replace the contents of `mobile/lib/main.dart`:

```dart
import 'package:flutter/material.dart';
import 'core/theme/app_theme.dart';

void main() {
  runApp(const RestaurantChatbotApp());
}

class RestaurantChatbotApp extends StatelessWidget {
  const RestaurantChatbotApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Restaurant Chatbot',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.dark,
      home: const Scaffold(
        body: Center(child: Text('Restaurant Chatbot')),
      ),
    );
  }
}
```

- [ ] **Step 9: Analyze and confirm the app builds**

```bash
flutter analyze
flutter test
```

Expected: no analyzer issues, 1 test passing.

- [ ] **Step 10: Commit**

```bash
git add mobile/
git commit -m "feat(mobile): scaffold Flutter Android project with AgentDine theme"
```

---

### Task 2: Core networking — ApiException + ApiClient

**Files:**
- Create: `mobile/lib/core/network/api_exception.dart`
- Create: `mobile/lib/core/network/api_client.dart`
- Test: `mobile/test/core/network/api_client_test.dart`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `ApiException(message, {statusCode})`; `ApiClient({http.Client? client, String baseUrl, String? Function()? tokenProvider})` with `Future<dynamic> get(String path, {Map<String,String>? query})` and `Future<dynamic> post(String path, {Object? body})` — consumed by every repository task from here on.

- [ ] **Step 1: Add the http dependency**

```bash
cd mobile && flutter pub add http
```

- [ ] **Step 2: Write the failing test**

Create `mobile/test/core/network/api_client_test.dart`:

```dart
import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:restaurant_chatbot_mobile/core/network/api_client.dart';
import 'package:restaurant_chatbot_mobile/core/network/api_exception.dart';

class _FailingStub implements Exception {
  const _FailingStub();
}

void main() {
  group('ApiClient', () {
    test('get() decodes a successful JSON response', () async {
      final mockClient = MockClient((request) async {
        expect(request.url.path, '/api/restaurants');
        return http.Response(jsonEncode({'data': [], 'total': 0}), 200);
      });
      final client = ApiClient(client: mockClient, baseUrl: 'http://10.0.2.2:3000/api');

      final result = await client.get('/restaurants');

      expect(result, {'data': [], 'total': 0});
    });

    test('get() attaches the Bearer token when tokenProvider returns one', () async {
      final mockClient = MockClient((request) async {
        expect(request.headers['Authorization'], 'Bearer test-token');
        return http.Response(jsonEncode({'ok': true}), 200);
      });
      final client = ApiClient(
        client: mockClient,
        baseUrl: 'http://10.0.2.2:3000/api',
        tokenProvider: () => 'test-token',
      );

      await client.get('/auth/me');
    });

    test('non-2xx response throws ApiException with the backend error message', () async {
      final mockClient = MockClient((request) async {
        return http.Response(jsonEncode({'error': 'Restaurant not found'}), 404);
      });
      final client = ApiClient(client: mockClient, baseUrl: 'http://10.0.2.2:3000/api');

      expect(
        () => client.get('/restaurants/missing'),
        throwsA(
          isA<ApiException>()
              .having((e) => e.statusCode, 'statusCode', 404)
              .having((e) => e.message, 'message', 'Restaurant not found'),
        ),
      );
    });

    test('a network failure is wrapped as an ApiException', () async {
      final mockClient = MockClient((request) async {
        throw const _FailingStub();
      });
      final client = ApiClient(client: mockClient, baseUrl: 'http://10.0.2.2:3000/api');

      expect(() => client.get('/restaurants'), throwsA(isA<ApiException>()));
    });

    test('post() sends the JSON-encoded body', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, 'POST');
        expect(jsonDecode(request.body), {'email': 'diner@example.com'});
        return http.Response(jsonEncode({'id': 'u1'}), 201);
      });
      final client = ApiClient(client: mockClient, baseUrl: 'http://10.0.2.2:3000/api');

      final result = await client.post('/auth/register', body: {'email': 'diner@example.com'});

      expect(result, {'id': 'u1'});
    });
  });
}
```

- [ ] **Step 3: Run the test and verify it fails**

```bash
flutter test test/core/network/api_client_test.dart
```

Expected: FAIL — `ApiClient` and `ApiException` don't exist.

- [ ] **Step 4: Implement ApiException**

Create `mobile/lib/core/network/api_exception.dart`:

```dart
class ApiException implements Exception {
  final int? statusCode;
  final String message;

  const ApiException(this.message, {this.statusCode});

  @override
  String toString() => 'ApiException($statusCode): $message';
}
```

- [ ] **Step 5: Implement ApiClient**

Create `mobile/lib/core/network/api_client.dart`:

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_exception.dart';

const String kApiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:3000/api',
);

class ApiClient {
  final http.Client _client;
  final String baseUrl;
  final String? Function()? tokenProvider;

  ApiClient({
    http.Client? client,
    this.baseUrl = kApiBaseUrl,
    this.tokenProvider,
  }) : _client = client ?? http.Client();

  Map<String, String> _headers() {
    final headers = {'Content-Type': 'application/json'};
    final token = tokenProvider?.call();
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  Future<dynamic> get(String path, {Map<String, String>? query}) {
    final uri = Uri.parse('$baseUrl$path').replace(queryParameters: query);
    return _send(() => _client.get(uri, headers: _headers()));
  }

  Future<dynamic> post(String path, {Object? body}) {
    final uri = Uri.parse('$baseUrl$path');
    return _send(() => _client.post(uri, headers: _headers(), body: jsonEncode(body)));
  }

  Future<dynamic> _send(Future<http.Response> Function() request) async {
    late http.Response response;
    try {
      response = await request();
    } catch (e) {
      throw ApiException('Network error: $e');
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      String message = 'Request failed with status ${response.statusCode}';
      try {
        final decoded = jsonDecode(response.body);
        if (decoded is Map && decoded['error'] is String) {
          message = decoded['error'] as String;
        }
      } catch (_) {
        // Response body wasn't JSON — keep the default message.
      }
      throw ApiException(message, statusCode: response.statusCode);
    }

    if (response.body.isEmpty) return null;
    return jsonDecode(response.body);
  }
}
```

- [ ] **Step 6: Run the test and verify it passes**

```bash
flutter test test/core/network/api_client_test.dart
```

Expected: PASS (5 tests).

- [ ] **Step 7: Analyze**

```bash
flutter analyze
```

Expected: no issues.

- [ ] **Step 8: Commit**

```bash
git add lib/core/network test/core/network pubspec.yaml pubspec.lock
git commit -m "feat(mobile): add ApiClient with Bearer-token injection and typed errors"
```

---

### Task 3: Core storage — TokenStorage

**Files:**
- Create: `mobile/lib/core/storage/token_storage.dart`
- Test: `mobile/test/core/storage/token_storage_test.dart`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `abstract class TokenStorage { Future<void> save(String token); Future<String?> read(); Future<void> clear(); }` and `class SecureTokenStorage implements TokenStorage` — consumed by the auth provider task.

- [ ] **Step 1: Add the flutter_secure_storage dependency**

```bash
cd mobile && flutter pub add flutter_secure_storage
```

- [ ] **Step 2: Write the failing test**

Create `mobile/test/core/storage/token_storage_test.dart`:

```dart
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:restaurant_chatbot_mobile/core/storage/token_storage.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const channel = MethodChannel('plugins.it_nomads.com/flutter_secure_storage');
  final Map<String, String> fakeNativeStorage = {};

  setUp(() {
    fakeNativeStorage.clear();
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (MethodCall call) async {
      switch (call.method) {
        case 'write':
          final args = Map<String, dynamic>.from(call.arguments as Map);
          fakeNativeStorage[args['key'] as String] = args['value'] as String;
          return null;
        case 'read':
          final args = Map<String, dynamic>.from(call.arguments as Map);
          return fakeNativeStorage[args['key'] as String];
        case 'delete':
          final args = Map<String, dynamic>.from(call.arguments as Map);
          fakeNativeStorage.remove(args['key'] as String);
          return null;
        default:
          return null;
      }
    });
  });

  group('SecureTokenStorage', () {
    test('save() then read() returns the saved token', () async {
      final storage = SecureTokenStorage();

      await storage.save('abc123');
      final result = await storage.read();

      expect(result, 'abc123');
    });

    test('read() returns null when nothing was saved', () async {
      final storage = SecureTokenStorage();

      final result = await storage.read();

      expect(result, isNull);
    });

    test('clear() removes the saved token', () async {
      final storage = SecureTokenStorage();
      await storage.save('abc123');

      await storage.clear();
      final result = await storage.read();

      expect(result, isNull);
    });
  });
}
```

- [ ] **Step 3: Run the test and verify it fails**

```bash
flutter test test/core/storage/token_storage_test.dart
```

Expected: FAIL — `TokenStorage`/`SecureTokenStorage` don't exist.

- [ ] **Step 4: Implement TokenStorage**

Create `mobile/lib/core/storage/token_storage.dart`:

```dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

abstract class TokenStorage {
  Future<void> save(String token);
  Future<String?> read();
  Future<void> clear();
}

class SecureTokenStorage implements TokenStorage {
  static const _tokenKey = 'auth_token';

  final FlutterSecureStorage _storage;

  SecureTokenStorage({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  @override
  Future<void> save(String token) => _storage.write(key: _tokenKey, value: token);

  @override
  Future<String?> read() => _storage.read(key: _tokenKey);

  @override
  Future<void> clear() => _storage.delete(key: _tokenKey);
}
```

- [ ] **Step 5: Run the test and verify it passes**

```bash
flutter test test/core/storage/token_storage_test.dart
```

Expected: PASS (3 tests).

- [ ] **Step 6: Analyze and commit**

```bash
flutter analyze
git add lib/core/storage test/core/storage pubspec.yaml pubspec.lock
git commit -m "feat(mobile): add encrypted TokenStorage for the auth token"
```

---

### Task 4: Auth data layer — UserModel, dummy Firebase config, AuthRepository, AuthProvider

**Files:**
- Create: `mobile/lib/features/auth/models/user_model.dart`
- Create: `mobile/lib/core/network/auth_token_holder.dart`
- Create: `mobile/lib/core/firebase/firebase_options_dummy.dart`
- Create: `mobile/lib/features/auth/data/auth_repository.dart`
- Create: `mobile/lib/features/auth/providers/auth_provider.dart`
- Modify: `mobile/lib/main.dart` (Firebase initialization)
- Test: `mobile/test/features/auth/providers/auth_provider_test.dart`

**Interfaces:**
- Consumes: `ApiClient` (Task 2), `TokenStorage` (Task 3).
- Produces: `UserModel` (`id`, `firebaseUid`, `email`, `name?`, `phone?`, `avatarUrl?`, `role`); `AuthTokenHolder` (mutable `String? token`, lets `ApiClient`'s synchronous `tokenProvider` read the current token without an async round-trip); `abstract class AuthRepository` with `signInWithEmail`, `registerWithEmail`, `signOut`, `fetchCurrentUser`; `enum AuthStatus { unknown, authenticated, unauthenticated }`; `AuthProvider` with `status`, `currentUser`, `error`, `isLoading`, `restoreSession()`, `signIn(email, password)`, `register(email, password, name)`, `signOut()` — consumed by every screen and by the router task.

- [ ] **Step 1: Add firebase_core and firebase_auth**

```bash
cd mobile && flutter pub add firebase_core firebase_auth
```

- [ ] **Step 2: Implement UserModel**

Create `mobile/lib/features/auth/models/user_model.dart`:

```dart
class UserModel {
  final String id;
  final String firebaseUid;
  final String email;
  final String? name;
  final String? phone;
  final String? avatarUrl;
  final String role;

  const UserModel({
    required this.id,
    required this.firebaseUid,
    required this.email,
    required this.role,
    this.name,
    this.phone,
    this.avatarUrl,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as String,
      firebaseUid: json['firebaseUid'] as String,
      email: json['email'] as String,
      name: json['name'] as String?,
      phone: json['phone'] as String?,
      avatarUrl: json['avatarUrl'] as String?,
      role: json['role'] as String,
    );
  }
}
```

This mirrors the backend's `UserResponseSchema` (`backend/src/modules/auth/auth.schema.ts`) field-for-field.

- [ ] **Step 3: Implement AuthTokenHolder**

Create `mobile/lib/core/network/auth_token_holder.dart`:

```dart
/// Mutable in-memory holder for the current auth token.
///
/// ApiClient needs the token synchronously on every request, but
/// TokenStorage reads are async. AuthProvider keeps this holder in sync
/// with whatever it just loaded/received, so ApiClient's tokenProvider
/// callback can read it without awaiting anything.
class AuthTokenHolder {
  String? token;
}
```

- [ ] **Step 4: Implement the dummy Firebase config**

Create `mobile/lib/core/firebase/firebase_options_dummy.dart`:

```dart
import 'package:firebase_core/firebase_core.dart';

/// Placeholder Firebase project configuration.
///
/// Replace these values with a real project's config (e.g. via
/// `flutterfire configure`) once one is provisioned. Firebase.initializeApp()
/// succeeds locally with these values, but any call that reaches Firebase's
/// servers (sign-in, sign-up) will fail — expected until real credentials
/// are swapped in.
class DummyFirebaseOptions {
  DummyFirebaseOptions._();

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'dummy-api-key',
    appId: '1:000000000000:android:0000000000000000000000',
    messagingSenderId: '000000000000',
    projectId: 'restaurant-chatbot-dummy',
    storageBucket: 'restaurant-chatbot-dummy.appspot.com',
  );
}
```

- [ ] **Step 5: Implement AuthRepository**

Create `mobile/lib/features/auth/data/auth_repository.dart`:

```dart
import 'package:firebase_auth/firebase_auth.dart' as fb;
import '../../../core/network/api_client.dart';
import '../models/user_model.dart';

abstract class AuthRepository {
  Future<String> signInWithEmail(String email, String password);
  Future<String> registerWithEmail(String email, String password, String name);
  Future<void> signOut();
  Future<UserModel> fetchCurrentUser();
}

class FirebaseAuthRepository implements AuthRepository {
  final fb.FirebaseAuth _firebaseAuth;
  final ApiClient _apiClient;

  FirebaseAuthRepository({
    required ApiClient apiClient,
    fb.FirebaseAuth? firebaseAuth,
  })  : _apiClient = apiClient,
        _firebaseAuth = firebaseAuth ?? fb.FirebaseAuth.instance;

  @override
  Future<String> signInWithEmail(String email, String password) async {
    final credential = await _firebaseAuth.signInWithEmailAndPassword(
      email: email,
      password: password,
    );
    final token = await credential.user!.getIdToken();
    return token!;
  }

  @override
  Future<String> registerWithEmail(String email, String password, String name) async {
    final credential = await _firebaseAuth.createUserWithEmailAndPassword(
      email: email,
      password: password,
    );
    final token = await credential.user!.getIdToken();
    await _apiClient.post('/auth/register', body: {
      'firebaseUid': credential.user!.uid,
      'email': email,
      'name': name,
    });
    return token!;
  }

  @override
  Future<void> signOut() => _firebaseAuth.signOut();

  @override
  Future<UserModel> fetchCurrentUser() async {
    final json = await _apiClient.get('/auth/me') as Map<String, dynamic>;
    return UserModel.fromJson(json);
  }
}
```

- [ ] **Step 6: Write the failing AuthProvider test**

Create `mobile/test/features/auth/providers/auth_provider_test.dart`:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:restaurant_chatbot_mobile/core/network/auth_token_holder.dart';
import 'package:restaurant_chatbot_mobile/core/storage/token_storage.dart';
import 'package:restaurant_chatbot_mobile/features/auth/data/auth_repository.dart';
import 'package:restaurant_chatbot_mobile/features/auth/models/user_model.dart';
import 'package:restaurant_chatbot_mobile/features/auth/providers/auth_provider.dart';

class FakeTokenStorage implements TokenStorage {
  String? _token;

  @override
  Future<void> save(String token) async => _token = token;

  @override
  Future<String?> read() async => _token;

  @override
  Future<void> clear() async => _token = null;
}

class FakeAuthRepository implements AuthRepository {
  bool shouldFail = false;
  final UserModel user = const UserModel(
    id: 'u1',
    firebaseUid: 'fb1',
    email: 'diner@example.com',
    role: 'CUSTOMER',
    name: 'Diner',
  );

  @override
  Future<String> signInWithEmail(String email, String password) async {
    if (shouldFail) throw Exception('Invalid credentials');
    return 'fake-token';
  }

  @override
  Future<String> registerWithEmail(String email, String password, String name) async {
    if (shouldFail) throw Exception('Registration failed');
    return 'fake-token';
  }

  @override
  Future<void> signOut() async {}

  @override
  Future<UserModel> fetchCurrentUser() async {
    if (shouldFail) throw Exception('Not found');
    return user;
  }
}

void main() {
  group('AuthProvider', () {
    late FakeAuthRepository repository;
    late FakeTokenStorage tokenStorage;
    late AuthTokenHolder tokenHolder;
    late AuthProvider provider;

    setUp(() {
      repository = FakeAuthRepository();
      tokenStorage = FakeTokenStorage();
      tokenHolder = AuthTokenHolder();
      provider = AuthProvider(
        repository: repository,
        tokenStorage: tokenStorage,
        tokenHolder: tokenHolder,
      );
    });

    test('restoreSession() sets unauthenticated when no token is stored', () async {
      await provider.restoreSession();

      expect(provider.status, AuthStatus.unauthenticated);
      expect(tokenHolder.token, isNull);
    });

    test('restoreSession() sets authenticated when a valid token is stored', () async {
      await tokenStorage.save('existing-token');

      await provider.restoreSession();

      expect(provider.status, AuthStatus.authenticated);
      expect(provider.currentUser?.email, 'diner@example.com');
      expect(tokenHolder.token, 'existing-token');
    });

    test('signIn() success stores the token and marks authenticated', () async {
      final result = await provider.signIn('diner@example.com', 'password123');

      expect(result, isTrue);
      expect(provider.status, AuthStatus.authenticated);
      expect(await tokenStorage.read(), 'fake-token');
      expect(tokenHolder.token, 'fake-token');
      expect(provider.isLoading, isFalse);
    });

    test('signIn() failure sets an error and stays unauthenticated', () async {
      repository.shouldFail = true;

      final result = await provider.signIn('diner@example.com', 'wrong-password');

      expect(result, isFalse);
      expect(provider.status, AuthStatus.unauthenticated);
      expect(provider.error, isNotNull);
    });

    test('signOut() clears the token and current user', () async {
      await provider.signIn('diner@example.com', 'password123');

      await provider.signOut();

      expect(provider.status, AuthStatus.unauthenticated);
      expect(provider.currentUser, isNull);
      expect(await tokenStorage.read(), isNull);
      expect(tokenHolder.token, isNull);
    });
  });
}
```

- [ ] **Step 7: Run the test and verify it fails**

```bash
flutter test test/features/auth/providers/auth_provider_test.dart
```

Expected: FAIL — `AuthProvider` doesn't exist.

- [ ] **Step 8: Implement AuthProvider**

Create `mobile/lib/features/auth/providers/auth_provider.dart`:

```dart
import 'package:flutter/foundation.dart';
import '../../../core/network/auth_token_holder.dart';
import '../../../core/storage/token_storage.dart';
import '../data/auth_repository.dart';
import '../models/user_model.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthProvider extends ChangeNotifier {
  final AuthRepository _repository;
  final TokenStorage _tokenStorage;
  final AuthTokenHolder _tokenHolder;

  AuthProvider({
    required AuthRepository repository,
    required TokenStorage tokenStorage,
    required AuthTokenHolder tokenHolder,
  })  : _repository = repository,
        _tokenStorage = tokenStorage,
        _tokenHolder = tokenHolder;

  AuthStatus status = AuthStatus.unknown;
  UserModel? currentUser;
  String? error;
  bool isLoading = false;

  Future<void> restoreSession() async {
    final token = await _tokenStorage.read();
    if (token == null) {
      status = AuthStatus.unauthenticated;
      notifyListeners();
      return;
    }
    _tokenHolder.token = token;
    try {
      currentUser = await _repository.fetchCurrentUser();
      status = AuthStatus.authenticated;
    } catch (_) {
      await _tokenStorage.clear();
      _tokenHolder.token = null;
      status = AuthStatus.unauthenticated;
    }
    notifyListeners();
  }

  Future<bool> signIn(String email, String password) {
    return _runAuthAction(() => _repository.signInWithEmail(email, password));
  }

  Future<bool> register(String email, String password, String name) {
    return _runAuthAction(() => _repository.registerWithEmail(email, password, name));
  }

  Future<bool> _runAuthAction(Future<String> Function() action) async {
    isLoading = true;
    error = null;
    notifyListeners();
    try {
      final token = await action();
      await _tokenStorage.save(token);
      _tokenHolder.token = token;
      currentUser = await _repository.fetchCurrentUser();
      status = AuthStatus.authenticated;
      return true;
    } catch (e) {
      error = e.toString();
      status = AuthStatus.unauthenticated;
      return false;
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<void> signOut() async {
    await _repository.signOut();
    await _tokenStorage.clear();
    _tokenHolder.token = null;
    currentUser = null;
    status = AuthStatus.unauthenticated;
    notifyListeners();
  }
}
```

- [ ] **Step 9: Run the test and verify it passes**

```bash
flutter test test/features/auth/providers/auth_provider_test.dart
```

Expected: PASS (5 tests).

- [ ] **Step 10: Initialize Firebase in main.dart**

Modify `mobile/lib/main.dart` — replace the `main()` function:

```dart
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'core/firebase/firebase_options_dummy.dart';
import 'core/theme/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DummyFirebaseOptions.android);
  runApp(const RestaurantChatbotApp());
}

class RestaurantChatbotApp extends StatelessWidget {
  const RestaurantChatbotApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Restaurant Chatbot',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.dark,
      home: const Scaffold(
        body: Center(child: Text('Restaurant Chatbot')),
      ),
    );
  }
}
```

- [ ] **Step 11: Analyze and run the full test suite**

```bash
flutter analyze
flutter test
```

Expected: no analyzer issues, all tests passing.

- [ ] **Step 12: Commit**

```bash
git add lib/features/auth lib/core/network/auth_token_holder.dart lib/core/firebase lib/main.dart test/features/auth pubspec.yaml pubspec.lock
git commit -m "feat(mobile): add Firebase-backed auth repository and AuthProvider"
```

---

### Task 5: Auth screens — Login & Register

**Files:**
- Create: `mobile/lib/features/auth/screens/login_screen.dart`
- Create: `mobile/lib/features/auth/screens/register_screen.dart`
- Test: `mobile/test/features/auth/screens/login_screen_test.dart`
- Test: `mobile/test/features/auth/screens/register_screen_test.dart`

**Interfaces:**
- Consumes: `AuthProvider` (Task 4), via `provider`'s `context.watch`/`context.read`.
- Produces: `LoginScreen`, `RegisterScreen` widgets — consumed by the router task. Both navigate to each other via `go_router`'s `context.go`.

- [ ] **Step 1: Add provider, go_router, and flutter_animate**

```bash
cd mobile && flutter pub add provider go_router flutter_animate
```

- [ ] **Step 2: Write the failing LoginScreen test**

Create `mobile/test/features/auth/screens/login_screen_test.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:restaurant_chatbot_mobile/core/network/auth_token_holder.dart';
import 'package:restaurant_chatbot_mobile/core/storage/token_storage.dart';
import 'package:restaurant_chatbot_mobile/features/auth/data/auth_repository.dart';
import 'package:restaurant_chatbot_mobile/features/auth/models/user_model.dart';
import 'package:restaurant_chatbot_mobile/features/auth/providers/auth_provider.dart';
import 'package:restaurant_chatbot_mobile/features/auth/screens/login_screen.dart';

class _FakeTokenStorage implements TokenStorage {
  String? _token;
  @override
  Future<void> save(String token) async => _token = token;
  @override
  Future<String?> read() async => _token;
  @override
  Future<void> clear() async => _token = null;
}

class _FakeAuthRepository implements AuthRepository {
  bool shouldFail = false;

  @override
  Future<String> signInWithEmail(String email, String password) async {
    if (shouldFail) throw Exception('Invalid email or password');
    return 'fake-token';
  }

  @override
  Future<String> registerWithEmail(String email, String password, String name) async => 'fake-token';

  @override
  Future<void> signOut() async {}

  @override
  Future<UserModel> fetchCurrentUser() async => const UserModel(
        id: 'u1',
        firebaseUid: 'fb1',
        email: 'diner@example.com',
        role: 'CUSTOMER',
      );
}

Future<void> _pumpLogin(WidgetTester tester, AuthProvider provider) async {
  final router = GoRouter(routes: [
    GoRoute(path: '/', builder: (context, state) => const LoginScreen()),
    GoRoute(path: '/register', builder: (context, state) => const Scaffold(body: Text('Register'))),
  ]);
  await tester.pumpWidget(
    ChangeNotifierProvider.value(
      value: provider,
      child: MaterialApp.router(routerConfig: router),
    ),
  );
}

void main() {
  group('LoginScreen', () {
    testWidgets('shows validation errors when submitted empty', (tester) async {
      final provider = AuthProvider(
        repository: _FakeAuthRepository(),
        tokenStorage: _FakeTokenStorage(),
        tokenHolder: AuthTokenHolder(),
      );
      await _pumpLogin(tester, provider);
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('login_submit_button')));
      await tester.pump();

      expect(find.text('Email is required'), findsOneWidget);
      expect(find.text('Password is required'), findsOneWidget);
    });

    testWidgets('successful sign-in marks the provider authenticated', (tester) async {
      final provider = AuthProvider(
        repository: _FakeAuthRepository(),
        tokenStorage: _FakeTokenStorage(),
        tokenHolder: AuthTokenHolder(),
      );
      await _pumpLogin(tester, provider);
      await tester.pumpAndSettle();

      await tester.enterText(find.byKey(const Key('login_email_field')), 'diner@example.com');
      await tester.enterText(find.byKey(const Key('login_password_field')), 'password123');
      await tester.tap(find.byKey(const Key('login_submit_button')));
      await tester.pumpAndSettle();

      expect(provider.status, AuthStatus.authenticated);
    });

    testWidgets('failed sign-in shows the error message from the provider', (tester) async {
      final repository = _FakeAuthRepository()..shouldFail = true;
      final provider = AuthProvider(
        repository: repository,
        tokenStorage: _FakeTokenStorage(),
        tokenHolder: AuthTokenHolder(),
      );
      await _pumpLogin(tester, provider);
      await tester.pumpAndSettle();

      await tester.enterText(find.byKey(const Key('login_email_field')), 'diner@example.com');
      await tester.enterText(find.byKey(const Key('login_password_field')), 'wrong');
      await tester.tap(find.byKey(const Key('login_submit_button')));
      await tester.pumpAndSettle();

      expect(find.text('Exception: Invalid email or password'), findsOneWidget);
    });
  });
}
```

- [ ] **Step 3: Run the test and verify it fails**

```bash
flutter test test/features/auth/screens/login_screen_test.dart
```

Expected: FAIL — `LoginScreen` doesn't exist.

- [ ] **Step 4: Implement LoginScreen**

Create `mobile/lib/features/auth/screens/login_screen.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit(AuthProvider auth) async {
    if (!_formKey.currentState!.validate()) return;
    await auth.signIn(_emailController.text.trim(), _passwordController.text);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Restaurant Chatbot',
                    style: Theme.of(context).textTheme.headlineSmall,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  const Text('Discover & book restaurants', textAlign: TextAlign.center),
                  const SizedBox(height: 24),
                  TextFormField(
                    key: const Key('login_email_field'),
                    controller: _emailController,
                    decoration: const InputDecoration(labelText: 'Email'),
                    keyboardType: TextInputType.emailAddress,
                    validator: (value) =>
                        (value == null || value.isEmpty) ? 'Email is required' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    key: const Key('login_password_field'),
                    controller: _passwordController,
                    decoration: const InputDecoration(labelText: 'Password'),
                    obscureText: true,
                    validator: (value) =>
                        (value == null || value.isEmpty) ? 'Password is required' : null,
                  ),
                  if (auth.error != null) ...[
                    const SizedBox(height: 12),
                    Text(auth.error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                  ],
                  const SizedBox(height: 20),
                  ElevatedButton(
                    key: const Key('login_submit_button'),
                    onPressed: auth.isLoading ? null : () => _submit(auth),
                    child: auth.isLoading
                        ? const SizedBox(
                            height: 18,
                            width: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Sign in'),
                  ),
                  TextButton(
                    onPressed: () => context.go('/register'),
                    child: const Text("Don't have an account? Register"),
                  ),
                ],
              ),
            ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.08, end: 0),
          ),
        ),
      ),
    );
  }
}
```

- [ ] **Step 5: Run the test and verify it passes**

```bash
flutter test test/features/auth/screens/login_screen_test.dart
```

Expected: PASS (3 tests).

- [ ] **Step 6: Write the failing RegisterScreen test**

Create `mobile/test/features/auth/screens/register_screen_test.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:restaurant_chatbot_mobile/core/network/auth_token_holder.dart';
import 'package:restaurant_chatbot_mobile/core/storage/token_storage.dart';
import 'package:restaurant_chatbot_mobile/features/auth/data/auth_repository.dart';
import 'package:restaurant_chatbot_mobile/features/auth/models/user_model.dart';
import 'package:restaurant_chatbot_mobile/features/auth/providers/auth_provider.dart';
import 'package:restaurant_chatbot_mobile/features/auth/screens/register_screen.dart';

class _FakeTokenStorage implements TokenStorage {
  String? _token;
  @override
  Future<void> save(String token) async => _token = token;
  @override
  Future<String?> read() async => _token;
  @override
  Future<void> clear() async => _token = null;
}

class _FakeAuthRepository implements AuthRepository {
  @override
  Future<String> signInWithEmail(String email, String password) async => 'fake-token';

  @override
  Future<String> registerWithEmail(String email, String password, String name) async => 'fake-token';

  @override
  Future<void> signOut() async {}

  @override
  Future<UserModel> fetchCurrentUser() async => const UserModel(
        id: 'u1',
        firebaseUid: 'fb1',
        email: 'diner@example.com',
        role: 'CUSTOMER',
      );
}

Future<void> _pumpRegister(WidgetTester tester, AuthProvider provider) async {
  final router = GoRouter(routes: [
    GoRoute(path: '/', builder: (context, state) => const RegisterScreen()),
  ]);
  await tester.pumpWidget(
    ChangeNotifierProvider.value(
      value: provider,
      child: MaterialApp.router(routerConfig: router),
    ),
  );
}

void main() {
  group('RegisterScreen', () {
    testWidgets('rejects a password shorter than 6 characters', (tester) async {
      final provider = AuthProvider(
        repository: _FakeAuthRepository(),
        tokenStorage: _FakeTokenStorage(),
        tokenHolder: AuthTokenHolder(),
      );
      await _pumpRegister(tester, provider);
      await tester.pumpAndSettle();

      await tester.enterText(find.byKey(const Key('register_name_field')), 'Diner');
      await tester.enterText(find.byKey(const Key('register_email_field')), 'diner@example.com');
      await tester.enterText(find.byKey(const Key('register_password_field')), '123');
      await tester.tap(find.byKey(const Key('register_submit_button')));
      await tester.pump();

      expect(find.text('Password must be at least 6 characters'), findsOneWidget);
    });

    testWidgets('successful registration marks the provider authenticated', (tester) async {
      final provider = AuthProvider(
        repository: _FakeAuthRepository(),
        tokenStorage: _FakeTokenStorage(),
        tokenHolder: AuthTokenHolder(),
      );
      await _pumpRegister(tester, provider);
      await tester.pumpAndSettle();

      await tester.enterText(find.byKey(const Key('register_name_field')), 'Diner');
      await tester.enterText(find.byKey(const Key('register_email_field')), 'diner@example.com');
      await tester.enterText(find.byKey(const Key('register_password_field')), 'password123');
      await tester.tap(find.byKey(const Key('register_submit_button')));
      await tester.pumpAndSettle();

      expect(provider.status, AuthStatus.authenticated);
    });
  });
}
```

- [ ] **Step 7: Run the test and verify it fails**

```bash
flutter test test/features/auth/screens/register_screen_test.dart
```

Expected: FAIL — `RegisterScreen` doesn't exist.

- [ ] **Step 8: Implement RegisterScreen**

Create `mobile/lib/features/auth/screens/register_screen.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit(AuthProvider auth) async {
    if (!_formKey.currentState!.validate()) return;
    await auth.register(
      _emailController.text.trim(),
      _passwordController.text,
      _nameController.text.trim(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      appBar: AppBar(title: const Text('Create account')),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextFormField(
                    key: const Key('register_name_field'),
                    controller: _nameController,
                    decoration: const InputDecoration(labelText: 'Full name'),
                    validator: (value) =>
                        (value == null || value.isEmpty) ? 'Name is required' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    key: const Key('register_email_field'),
                    controller: _emailController,
                    decoration: const InputDecoration(labelText: 'Email'),
                    keyboardType: TextInputType.emailAddress,
                    validator: (value) =>
                        (value == null || value.isEmpty) ? 'Email is required' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    key: const Key('register_password_field'),
                    controller: _passwordController,
                    decoration: const InputDecoration(labelText: 'Password (min 6 characters)'),
                    obscureText: true,
                    validator: (value) => (value == null || value.length < 6)
                        ? 'Password must be at least 6 characters'
                        : null,
                  ),
                  if (auth.error != null) ...[
                    const SizedBox(height: 12),
                    Text(auth.error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                  ],
                  const SizedBox(height: 20),
                  ElevatedButton(
                    key: const Key('register_submit_button'),
                    onPressed: auth.isLoading ? null : () => _submit(auth),
                    child: auth.isLoading
                        ? const SizedBox(
                            height: 18,
                            width: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Create account'),
                  ),
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

- [ ] **Step 9: Run the test and verify it passes**

```bash
flutter test test/features/auth/screens/register_screen_test.dart
```

Expected: PASS (2 tests).

- [ ] **Step 10: Analyze and commit**

```bash
flutter analyze
git add lib/features/auth/screens test/features/auth/screens pubspec.yaml pubspec.lock
git commit -m "feat(mobile): add Login and Register screens"
```

---

### Task 6: Restaurant data layer — RestaurantModel + RestaurantRepository

**Files:**
- Create: `mobile/lib/features/restaurants/models/restaurant_model.dart`
- Create: `mobile/lib/features/restaurants/data/restaurant_repository.dart`
- Test: `mobile/test/features/restaurants/data/restaurant_repository_test.dart`

**Interfaces:**
- Consumes: `ApiClient` (Task 2).
- Produces: `RestaurantModel`, `RestaurantPage`, `RestaurantFilters`, `abstract class RestaurantRepository` with `listRestaurants(RestaurantFilters)` and `getRestaurantById(String)` — consumed by the provider task and (extended in Task 9) the detail provider.

This mirrors `backend/src/modules/restaurant/restaurant.service.ts`'s `listRestaurants`/`getRestaurantById`, which return the raw Prisma `Restaurant` fields with `cuisineTypes`/`imageUrls` parsed into string arrays.

- [ ] **Step 1: Write the failing test**

Create `mobile/test/features/restaurants/data/restaurant_repository_test.dart`:

```dart
import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:restaurant_chatbot_mobile/core/network/api_client.dart';
import 'package:restaurant_chatbot_mobile/features/restaurants/data/restaurant_repository.dart';

void main() {
  group('ApiRestaurantRepository', () {
    test('listRestaurants() maps the backend page response', () async {
      final mockClient = MockClient((request) async {
        expect(request.url.path, '/api/restaurants');
        expect(request.url.queryParameters['search'], 'seafood');
        return http.Response(
          jsonEncode({
            'data': [
              {
                'id': 'r1',
                'name': 'Ocean Grill',
                'description': 'Seafood spot',
                'address': '12 Marine Dr',
                'area': 'Colombo 3',
                'phone': null,
                'cuisineTypes': ['Seafood'],
                'priceRange': 'MODERATE',
                'openingHours': {'mon': '9-22'},
                'imageUrls': ['https://example.com/1.jpg'],
                'profileImageUrl': null,
                'coverImageUrl': null,
                'isVerified': true,
                'avgRating': 4.5,
                'totalReviews': 12,
                'latitude': 6.9,
                'longitude': 79.8,
              }
            ],
            'total': 1,
            'page': 1,
            'limit': 20,
          }),
          200,
        );
      });
      final repository = ApiRestaurantRepository(
        ApiClient(client: mockClient, baseUrl: 'http://10.0.2.2:3000/api'),
      );

      final page = await repository.listRestaurants(const RestaurantFilters(search: 'seafood'));

      expect(page.total, 1);
      expect(page.data.single.name, 'Ocean Grill');
      expect(page.data.single.cuisineTypes, ['Seafood']);
      expect(page.data.single.avgRating, 4.5);
    });

    test('getRestaurantById() maps a single restaurant', () async {
      final mockClient = MockClient((request) async {
        expect(request.url.path, '/api/restaurants/r1');
        return http.Response(
          jsonEncode({
            'id': 'r1',
            'name': 'Ocean Grill',
            'address': '12 Marine Dr',
            'area': 'Colombo 3',
            'cuisineTypes': ['Seafood'],
            'priceRange': 'MODERATE',
            'imageUrls': <String>[],
            'isVerified': true,
            'totalReviews': 12,
          }),
          200,
        );
      });
      final repository = ApiRestaurantRepository(
        ApiClient(client: mockClient, baseUrl: 'http://10.0.2.2:3000/api'),
      );

      final restaurant = await repository.getRestaurantById('r1');

      expect(restaurant.id, 'r1');
      expect(restaurant.name, 'Ocean Grill');
    });
  });
}
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
cd mobile && flutter test test/features/restaurants/data/restaurant_repository_test.dart
```

Expected: FAIL — `RestaurantModel`/`ApiRestaurantRepository` don't exist.

- [ ] **Step 3: Implement RestaurantModel**

Create `mobile/lib/features/restaurants/models/restaurant_model.dart`:

```dart
class RestaurantModel {
  final String id;
  final String name;
  final String? description;
  final String address;
  final String area;
  final String? phone;
  final List<String> cuisineTypes;
  final String priceRange;
  final Map<String, dynamic>? openingHours;
  final List<String> imageUrls;
  final String? profileImageUrl;
  final String? coverImageUrl;
  final bool isVerified;
  final double? avgRating;
  final int totalReviews;
  final double? latitude;
  final double? longitude;

  const RestaurantModel({
    required this.id,
    required this.name,
    required this.address,
    required this.area,
    required this.cuisineTypes,
    required this.priceRange,
    required this.imageUrls,
    required this.isVerified,
    required this.totalReviews,
    this.description,
    this.phone,
    this.openingHours,
    this.profileImageUrl,
    this.coverImageUrl,
    this.avgRating,
    this.latitude,
    this.longitude,
  });

  factory RestaurantModel.fromJson(Map<String, dynamic> json) {
    return RestaurantModel(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      address: json['address'] as String,
      area: json['area'] as String,
      phone: json['phone'] as String?,
      cuisineTypes: List<String>.from(json['cuisineTypes'] as List? ?? const []),
      priceRange: json['priceRange'] as String,
      openingHours: json['openingHours'] as Map<String, dynamic>?,
      imageUrls: List<String>.from(json['imageUrls'] as List? ?? const []),
      profileImageUrl: json['profileImageUrl'] as String?,
      coverImageUrl: json['coverImageUrl'] as String?,
      isVerified: json['isVerified'] as bool? ?? false,
      avgRating: (json['avgRating'] as num?)?.toDouble(),
      totalReviews: json['totalReviews'] as int? ?? 0,
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
    );
  }
}

class RestaurantPage {
  final List<RestaurantModel> data;
  final int total;
  final int page;
  final int limit;

  const RestaurantPage({
    required this.data,
    required this.total,
    required this.page,
    required this.limit,
  });

  factory RestaurantPage.fromJson(Map<String, dynamic> json) {
    return RestaurantPage(
      data: (json['data'] as List)
          .map((e) => RestaurantModel.fromJson(e as Map<String, dynamic>))
          .toList(),
      total: json['total'] as int,
      page: json['page'] as int,
      limit: json['limit'] as int,
    );
  }
}
```

- [ ] **Step 4: Implement RestaurantRepository**

Create `mobile/lib/features/restaurants/data/restaurant_repository.dart`:

```dart
import '../../../core/network/api_client.dart';
import '../models/restaurant_model.dart';

class RestaurantFilters {
  final String? search;
  final String? area;
  final String? cuisine;
  final String? priceRange;
  final double? minRating;
  final int page;

  const RestaurantFilters({
    this.search,
    this.area,
    this.cuisine,
    this.priceRange,
    this.minRating,
    this.page = 1,
  });

  Map<String, String> toQuery() {
    final query = <String, String>{'page': page.toString()};
    if (search != null && search!.isNotEmpty) query['search'] = search!;
    if (area != null && area!.isNotEmpty) query['area'] = area!;
    if (cuisine != null && cuisine!.isNotEmpty) query['cuisine'] = cuisine!;
    if (priceRange != null) query['priceRange'] = priceRange!;
    if (minRating != null) query['minRating'] = minRating.toString();
    return query;
  }
}

abstract class RestaurantRepository {
  Future<RestaurantPage> listRestaurants(RestaurantFilters filters);
  Future<RestaurantModel> getRestaurantById(String id);
}

class ApiRestaurantRepository implements RestaurantRepository {
  final ApiClient _apiClient;

  ApiRestaurantRepository(this._apiClient);

  @override
  Future<RestaurantPage> listRestaurants(RestaurantFilters filters) async {
    final json = await _apiClient.get('/restaurants', query: filters.toQuery());
    return RestaurantPage.fromJson(json as Map<String, dynamic>);
  }

  @override
  Future<RestaurantModel> getRestaurantById(String id) async {
    final json = await _apiClient.get('/restaurants/$id');
    return RestaurantModel.fromJson(json as Map<String, dynamic>);
  }
}
```

- [ ] **Step 5: Run the test and verify it passes**

```bash
flutter test test/features/restaurants/data/restaurant_repository_test.dart
```

Expected: PASS (2 tests).

- [ ] **Step 6: Analyze and commit**

```bash
flutter analyze
git add lib/features/restaurants/models lib/features/restaurants/data test/features/restaurants/data
git commit -m "feat(mobile): add RestaurantModel and RestaurantRepository"
```

---

### Task 7: RestaurantProvider + RestaurantCard

**Files:**
- Create: `mobile/lib/features/restaurants/providers/restaurant_provider.dart`
- Create: `mobile/lib/features/restaurants/widgets/restaurant_card.dart`
- Test: `mobile/test/features/restaurants/providers/restaurant_provider_test.dart`
- Test: `mobile/test/features/restaurants/widgets/restaurant_card_test.dart`

**Interfaces:**
- Consumes: `RestaurantRepository`, `RestaurantModel`, `RestaurantFilters`, `RestaurantPage` (Task 6); `AppColors` (Task 1).
- Produces: `RestaurantProvider` (`restaurants`, `isLoading`, `error`, `filters`, `fetchRestaurants({filters})`); `RestaurantCard({restaurant, onTap})` — consumed by Home screen task.

- [ ] **Step 1: Write the failing RestaurantProvider test**

Create `mobile/test/features/restaurants/providers/restaurant_provider_test.dart`:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:restaurant_chatbot_mobile/features/restaurants/data/restaurant_repository.dart';
import 'package:restaurant_chatbot_mobile/features/restaurants/models/restaurant_model.dart';
import 'package:restaurant_chatbot_mobile/features/restaurants/providers/restaurant_provider.dart';

class _FakeRestaurantRepository implements RestaurantRepository {
  bool shouldFail = false;
  RestaurantFilters? lastFilters;

  @override
  Future<RestaurantPage> listRestaurants(RestaurantFilters filters) async {
    lastFilters = filters;
    if (shouldFail) throw Exception('Network error');
    return const RestaurantPage(
      data: [
        RestaurantModel(
          id: 'r1',
          name: 'Ocean Grill',
          address: '12 Marine Dr',
          area: 'Colombo 3',
          cuisineTypes: ['Seafood'],
          priceRange: 'MODERATE',
          imageUrls: [],
          isVerified: true,
          totalReviews: 12,
        ),
      ],
      total: 1,
      page: 1,
      limit: 20,
    );
  }

  @override
  Future<RestaurantModel> getRestaurantById(String id) async => throw UnimplementedError();
}

void main() {
  group('RestaurantProvider', () {
    test('fetchRestaurants() populates the list on success', () async {
      final provider = RestaurantProvider(_FakeRestaurantRepository());

      await provider.fetchRestaurants();

      expect(provider.restaurants, hasLength(1));
      expect(provider.restaurants.first.name, 'Ocean Grill');
      expect(provider.isLoading, isFalse);
      expect(provider.error, isNull);
    });

    test('fetchRestaurants() sets an error on failure', () async {
      final repository = _FakeRestaurantRepository()..shouldFail = true;
      final provider = RestaurantProvider(repository);

      await provider.fetchRestaurants();

      expect(provider.error, isNotNull);
      expect(provider.restaurants, isEmpty);
      expect(provider.isLoading, isFalse);
    });

    test('fetchRestaurants() forwards the given filters to the repository', () async {
      final repository = _FakeRestaurantRepository();
      final provider = RestaurantProvider(repository);

      await provider.fetchRestaurants(filters: const RestaurantFilters(search: 'seafood'));

      expect(repository.lastFilters?.search, 'seafood');
    });
  });
}
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
cd mobile && flutter test test/features/restaurants/providers/restaurant_provider_test.dart
```

Expected: FAIL — `RestaurantProvider` doesn't exist.

- [ ] **Step 3: Implement RestaurantProvider**

Create `mobile/lib/features/restaurants/providers/restaurant_provider.dart`:

```dart
import 'package:flutter/foundation.dart';
import '../data/restaurant_repository.dart';
import '../models/restaurant_model.dart';

class RestaurantProvider extends ChangeNotifier {
  final RestaurantRepository _repository;

  RestaurantProvider(this._repository);

  List<RestaurantModel> restaurants = [];
  bool isLoading = false;
  String? error;
  RestaurantFilters filters = const RestaurantFilters();

  Future<void> fetchRestaurants({RestaurantFilters? filters}) async {
    if (filters != null) this.filters = filters;
    isLoading = true;
    error = null;
    notifyListeners();
    try {
      final page = await _repository.listRestaurants(this.filters);
      restaurants = page.data;
    } catch (e) {
      error = e.toString();
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }
}
```

- [ ] **Step 4: Run the test and verify it passes**

```bash
flutter test test/features/restaurants/providers/restaurant_provider_test.dart
```

Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing RestaurantCard test**

Create `mobile/test/features/restaurants/widgets/restaurant_card_test.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:restaurant_chatbot_mobile/features/restaurants/models/restaurant_model.dart';
import 'package:restaurant_chatbot_mobile/features/restaurants/widgets/restaurant_card.dart';

void main() {
  const restaurant = RestaurantModel(
    id: 'r1',
    name: 'Ocean Grill',
    address: '12 Marine Dr',
    area: 'Colombo 3',
    cuisineTypes: ['Seafood'],
    priceRange: 'MODERATE',
    imageUrls: [],
    isVerified: true,
    totalReviews: 12,
    avgRating: 4.5,
  );

  testWidgets('shows name, area, price range, and rating; tap fires onTap', (tester) async {
    var tapped = false;
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: RestaurantCard(restaurant: restaurant, onTap: () => tapped = true),
      ),
    ));
    await tester.pumpAndSettle();

    expect(find.text('Ocean Grill'), findsOneWidget);
    expect(find.text('Colombo 3 · MODERATE'), findsOneWidget);
    expect(find.text('4.5 (12)'), findsOneWidget);

    await tester.tap(find.byType(RestaurantCard));
    expect(tapped, isTrue);
  });

  testWidgets('shows "No reviews yet" when avgRating is null', (tester) async {
    const noRatingRestaurant = RestaurantModel(
      id: 'r2',
      name: 'New Spot',
      address: '1 Main St',
      area: 'Colombo 5',
      cuisineTypes: [],
      priceRange: 'BUDGET',
      imageUrls: [],
      isVerified: false,
      totalReviews: 0,
    );
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: RestaurantCard(restaurant: noRatingRestaurant, onTap: () {}),
      ),
    ));
    await tester.pumpAndSettle();

    expect(find.text('No reviews yet'), findsOneWidget);
  });
}
```

- [ ] **Step 6: Run the test and verify it fails**

```bash
flutter test test/features/restaurants/widgets/restaurant_card_test.dart
```

Expected: FAIL — `RestaurantCard` doesn't exist.

- [ ] **Step 7: Implement RestaurantCard**

Create `mobile/lib/features/restaurants/widgets/restaurant_card.dart`:

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
      color: AppColors.card,
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: SizedBox(
                  width: 64,
                  height: 64,
                  child: restaurant.imageUrls.isNotEmpty
                      ? Image.network(restaurant.imageUrls.first, fit: BoxFit.cover)
                      : Container(
                          color: AppColors.secondary,
                          child: const Icon(Icons.restaurant, color: AppColors.mutedForeground),
                        ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      restaurant.name,
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${restaurant.area} · ${restaurant.priceRange}',
                      style: const TextStyle(color: AppColors.mutedForeground, fontSize: 13),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(Icons.star, color: AppColors.primary, size: 14),
                        const SizedBox(width: 4),
                        Text(
                          restaurant.avgRating != null
                              ? '${restaurant.avgRating!.toStringAsFixed(1)} (${restaurant.totalReviews})'
                              : 'No reviews yet',
                          style: const TextStyle(color: AppColors.mutedForeground, fontSize: 12),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: AppColors.mutedForeground),
            ],
          ),
        ),
      ),
    ).animate().fadeIn(duration: 300.ms).slideY(begin: 0.06, end: 0);
  }
}
```

- [ ] **Step 8: Run the test and verify it passes**

```bash
flutter test test/features/restaurants/widgets/restaurant_card_test.dart
```

Expected: PASS (2 tests).

- [ ] **Step 9: Analyze and commit**

```bash
flutter analyze
git add lib/features/restaurants/providers lib/features/restaurants/widgets test/features/restaurants/providers test/features/restaurants/widgets
git commit -m "feat(mobile): add RestaurantProvider and animated RestaurantCard"
```

---

### Task 8: HomeScreen — search, filters, restaurant list

**Files:**
- Create: `mobile/lib/shared/widgets/loading_view.dart`
- Create: `mobile/lib/shared/widgets/error_retry_view.dart`
- Create: `mobile/lib/features/restaurants/screens/home_screen.dart`
- Test: `mobile/test/features/restaurants/screens/home_screen_test.dart`

**Interfaces:**
- Consumes: `RestaurantProvider`, `RestaurantFilters` (Task 6/7), `RestaurantCard` (Task 7).
- Produces: `LoadingView`, `ErrorRetryView` (reused by the detail screen task); `HomeScreen` — consumed by the router task.

- [ ] **Step 1: Implement LoadingView**

Create `mobile/lib/shared/widgets/loading_view.dart`:

```dart
import 'package:flutter/material.dart';

class LoadingView extends StatelessWidget {
  const LoadingView({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(child: CircularProgressIndicator());
  }
}
```

- [ ] **Step 2: Implement ErrorRetryView**

Create `mobile/lib/shared/widgets/error_retry_view.dart`:

```dart
import 'package:flutter/material.dart';

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
    );
  }
}
```

- [ ] **Step 3: Write the failing HomeScreen test**

Create `mobile/test/features/restaurants/screens/home_screen_test.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:restaurant_chatbot_mobile/features/restaurants/data/restaurant_repository.dart';
import 'package:restaurant_chatbot_mobile/features/restaurants/models/restaurant_model.dart';
import 'package:restaurant_chatbot_mobile/features/restaurants/providers/restaurant_provider.dart';
import 'package:restaurant_chatbot_mobile/features/restaurants/screens/home_screen.dart';

class _FakeRestaurantRepository implements RestaurantRepository {
  bool shouldFail = false;

  @override
  Future<RestaurantPage> listRestaurants(RestaurantFilters filters) async {
    if (shouldFail) throw Exception('Could not load restaurants');
    return const RestaurantPage(
      data: [
        RestaurantModel(
          id: 'r1',
          name: 'Ocean Grill',
          address: '12 Marine Dr',
          area: 'Colombo 3',
          cuisineTypes: ['Seafood'],
          priceRange: 'MODERATE',
          imageUrls: [],
          isVerified: true,
          totalReviews: 12,
          avgRating: 4.5,
        ),
      ],
      total: 1,
      page: 1,
      limit: 20,
    );
  }

  @override
  Future<RestaurantModel> getRestaurantById(String id) async => throw UnimplementedError();
}

Future<void> _pumpHome(WidgetTester tester, RestaurantProvider provider) async {
  final router = GoRouter(routes: [
    GoRoute(path: '/', builder: (context, state) => const HomeScreen()),
    GoRoute(
      path: '/restaurants/:id',
      builder: (context, state) => Scaffold(body: Text('Detail ${state.pathParameters['id']}')),
    ),
  ]);
  await tester.pumpWidget(
    ChangeNotifierProvider.value(
      value: provider,
      child: MaterialApp.router(routerConfig: router),
    ),
  );
}

void main() {
  group('HomeScreen', () {
    testWidgets('loads and displays restaurants on start', (tester) async {
      final provider = RestaurantProvider(_FakeRestaurantRepository());
      await _pumpHome(tester, provider);
      await tester.pumpAndSettle();

      expect(find.text('Ocean Grill'), findsOneWidget);
    });

    testWidgets('shows a retry view on load failure', (tester) async {
      final provider = RestaurantProvider(_FakeRestaurantRepository()..shouldFail = true);
      await _pumpHome(tester, provider);
      await tester.pumpAndSettle();

      expect(find.text('Exception: Could not load restaurants'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });

    testWidgets('tapping a restaurant card navigates to its detail route', (tester) async {
      final provider = RestaurantProvider(_FakeRestaurantRepository());
      await _pumpHome(tester, provider);
      await tester.pumpAndSettle();

      await tester.tap(find.text('Ocean Grill'));
      await tester.pumpAndSettle();

      expect(find.text('Detail r1'), findsOneWidget);
    });
  });
}
```

- [ ] **Step 4: Run the test and verify it fails**

```bash
cd mobile && flutter test test/features/restaurants/screens/home_screen_test.dart
```

Expected: FAIL — `HomeScreen` doesn't exist.

- [ ] **Step 5: Implement HomeScreen**

Create `mobile/lib/features/restaurants/screens/home_screen.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../shared/widgets/error_retry_view.dart';
import '../../../shared/widgets/loading_view.dart';
import '../data/restaurant_repository.dart';
import '../providers/restaurant_provider.dart';
import '../widgets/restaurant_card.dart';

const _priceRanges = ['BUDGET', 'MODERATE', 'EXPENSIVE', 'FINE_DINING'];

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _searchController = TextEditingController();
  String? _selectedPriceRange;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<RestaurantProvider>().fetchRestaurants();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _applyFilters() {
    context.read<RestaurantProvider>().fetchRestaurants(
          filters: RestaurantFilters(
            search: _searchController.text.trim(),
            priceRange: _selectedPriceRange,
          ),
        );
  }

  @override
  Widget build(BuildContext context) {
    final restaurantProvider = context.watch<RestaurantProvider>();

    return Scaffold(
      appBar: AppBar(title: const Text('Discover restaurants')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: TextField(
              key: const Key('home_search_field'),
              controller: _searchController,
              decoration: const InputDecoration(
                hintText: 'Search restaurants…',
                prefixIcon: Icon(Icons.search),
              ),
              onSubmitted: (_) => _applyFilters(),
            ),
          ),
          SizedBox(
            height: 48,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              children: _priceRanges.map((range) {
                final selected = _selectedPriceRange == range;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    key: Key('filter_chip_$range'),
                    label: Text(range),
                    selected: selected,
                    onSelected: (isSelected) {
                      setState(() => _selectedPriceRange = isSelected ? range : null);
                      _applyFilters();
                    },
                  ),
                );
              }).toList(),
            ),
          ),
          Expanded(
            child: Builder(builder: (context) {
              if (restaurantProvider.isLoading && restaurantProvider.restaurants.isEmpty) {
                return const LoadingView();
              }
              if (restaurantProvider.error != null && restaurantProvider.restaurants.isEmpty) {
                return ErrorRetryView(message: restaurantProvider.error!, onRetry: _applyFilters);
              }
              if (restaurantProvider.restaurants.isEmpty) {
                return const Center(child: Text('No restaurants found'));
              }
              return ListView.builder(
                itemCount: restaurantProvider.restaurants.length,
                itemBuilder: (context, index) {
                  final restaurant = restaurantProvider.restaurants[index];
                  return RestaurantCard(
                    restaurant: restaurant,
                    onTap: () => context.push('/restaurants/${restaurant.id}'),
                  );
                },
              );
            }),
          ),
        ],
      ),
    );
  }
}
```

- [ ] **Step 6: Run the test and verify it passes**

```bash
flutter test test/features/restaurants/screens/home_screen_test.dart
```

Expected: PASS (3 tests).

- [ ] **Step 7: Analyze and commit**

```bash
flutter analyze
git add lib/shared/widgets/loading_view.dart lib/shared/widgets/error_retry_view.dart lib/features/restaurants/screens/home_screen.dart test/features/restaurants/screens/home_screen_test.dart
git commit -m "feat(mobile): add HomeScreen with search, price filters, and restaurant list"
```

---

### Task 9: Restaurant detail data — menu, reviews, promotions + RestaurantDetailProvider

**Files:**
- Create: `mobile/lib/features/restaurants/models/menu_item_model.dart`
- Create: `mobile/lib/features/restaurants/models/review_model.dart`
- Create: `mobile/lib/features/restaurants/models/promotion_model.dart`
- Modify: `mobile/lib/features/restaurants/data/restaurant_repository.dart` (add `getMenu`, `getReviews`, `getPromotions`)
- Create: `mobile/lib/features/restaurants/providers/restaurant_detail_provider.dart`
- Test: `mobile/test/features/restaurants/models/menu_item_model_test.dart`
- Modify: `mobile/test/features/restaurants/data/restaurant_repository_test.dart` (add 3 tests)
- Test: `mobile/test/features/restaurants/providers/restaurant_detail_provider_test.dart`

**Interfaces:**
- Consumes: `RestaurantRepository`, `ApiClient` (Task 6).
- Produces: `MenuItemModel`, `ReviewModel`, `ReviewPage`, `PromotionModel`; extended `RestaurantRepository` with `getMenu(id)`, `getReviews(id)`, `getPromotions(id)`; `RestaurantDetailProvider` (`restaurant`, `menu`, `reviews`, `promotions`, `isLoading`, `error`, `load(id)`) — consumed by the detail screen task and the router task.

This mirrors `getMenu`/`getRestaurantReviews`/`getActivePromotions` in `backend/src/modules/restaurant/restaurant.service.ts`. Note: the backend's `getMenu` does **not** parse `MenuItem.dietaryInfo` — it comes back as a raw JSON-encoded string, not an array, so the model must decode it defensively.

- [ ] **Step 1: Write the failing MenuItemModel test**

Create `mobile/test/features/restaurants/models/menu_item_model_test.dart`:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:restaurant_chatbot_mobile/features/restaurants/models/menu_item_model.dart';

void main() {
  group('MenuItemModel.fromJson', () {
    test('decodes dietaryInfo when the backend sends a JSON-encoded string', () {
      final item = MenuItemModel.fromJson({
        'id': 'm1',
        'name': 'Grilled Prawns',
        'description': 'With garlic butter',
        'price': 2500,
        'category': 'Mains',
        'dietaryInfo': '["gluten-free","pescatarian"]',
        'imageUrl': null,
      });

      expect(item.dietaryInfo, ['gluten-free', 'pescatarian']);
      expect(item.price, 2500.0);
    });

    test('falls back to an empty list when dietaryInfo is missing or malformed', () {
      final item = MenuItemModel.fromJson({
        'id': 'm2',
        'name': 'House Salad',
        'price': 900,
        'category': 'Starters',
        'dietaryInfo': 'not-json',
      });

      expect(item.dietaryInfo, isEmpty);
    });
  });
}
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
cd mobile && flutter test test/features/restaurants/models/menu_item_model_test.dart
```

Expected: FAIL — `MenuItemModel` doesn't exist.

- [ ] **Step 3: Implement MenuItemModel**

Create `mobile/lib/features/restaurants/models/menu_item_model.dart`:

```dart
import 'dart:convert';

class MenuItemModel {
  final String id;
  final String name;
  final String? description;
  final double price;
  final String category;
  final List<String> dietaryInfo;
  final String? imageUrl;

  const MenuItemModel({
    required this.id,
    required this.name,
    required this.price,
    required this.category,
    required this.dietaryInfo,
    this.description,
    this.imageUrl,
  });

  factory MenuItemModel.fromJson(Map<String, dynamic> json) {
    var parsedDietaryInfo = <String>[];
    final rawDietaryInfo = json['dietaryInfo'];
    if (rawDietaryInfo is String) {
      try {
        parsedDietaryInfo = List<String>.from(jsonDecode(rawDietaryInfo) as List);
      } catch (_) {
        parsedDietaryInfo = <String>[];
      }
    } else if (rawDietaryInfo is List) {
      parsedDietaryInfo = List<String>.from(rawDietaryInfo);
    }

    return MenuItemModel(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      price: (json['price'] as num).toDouble(),
      category: json['category'] as String,
      dietaryInfo: parsedDietaryInfo,
      imageUrl: json['imageUrl'] as String?,
    );
  }
}
```

- [ ] **Step 4: Run the test and verify it passes**

```bash
flutter test test/features/restaurants/models/menu_item_model_test.dart
```

Expected: PASS (2 tests).

- [ ] **Step 5: Implement ReviewModel and PromotionModel**

Create `mobile/lib/features/restaurants/models/review_model.dart`:

```dart
class ReviewModel {
  final String id;
  final int rating;
  final String? comment;
  final String? userName;
  final String createdAt;

  const ReviewModel({
    required this.id,
    required this.rating,
    required this.createdAt,
    this.comment,
    this.userName,
  });

  factory ReviewModel.fromJson(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>?;
    return ReviewModel(
      id: json['id'] as String,
      rating: json['rating'] as int,
      comment: json['comment'] as String?,
      userName: user?['name'] as String?,
      createdAt: json['createdAt'] as String,
    );
  }
}

class ReviewPage {
  final List<ReviewModel> data;
  final int total;
  final double? avgRating;

  const ReviewPage({required this.data, required this.total, this.avgRating});

  factory ReviewPage.fromJson(Map<String, dynamic> json) {
    return ReviewPage(
      data: (json['data'] as List)
          .map((e) => ReviewModel.fromJson(e as Map<String, dynamic>))
          .toList(),
      total: json['total'] as int,
      avgRating: (json['avgRating'] as num?)?.toDouble(),
    );
  }
}
```

Create `mobile/lib/features/restaurants/models/promotion_model.dart`:

```dart
class PromotionModel {
  final String id;
  final String title;
  final String description;
  final String type;
  final double? discountValue;
  final String? imageUrl;

  const PromotionModel({
    required this.id,
    required this.title,
    required this.description,
    required this.type,
    this.discountValue,
    this.imageUrl,
  });

  factory PromotionModel.fromJson(Map<String, dynamic> json) {
    return PromotionModel(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      type: json['type'] as String,
      discountValue: (json['discountValue'] as num?)?.toDouble(),
      imageUrl: json['imageUrl'] as String?,
    );
  }
}
```

- [ ] **Step 6: Add failing tests for the repository's new methods**

Append to `mobile/test/features/restaurants/data/restaurant_repository_test.dart` (inside the existing `group('ApiRestaurantRepository', ...)` block, after the last test):

```dart
    test('getMenu() maps the menu item list', () async {
      final mockClient = MockClient((request) async {
        expect(request.url.path, '/api/restaurants/r1/menu');
        return http.Response(
          jsonEncode([
            {
              'id': 'm1',
              'name': 'Grilled Prawns',
              'price': 2500,
              'category': 'Mains',
              'dietaryInfo': '[]',
            }
          ]),
          200,
        );
      });
      final repository = ApiRestaurantRepository(
        ApiClient(client: mockClient, baseUrl: 'http://10.0.2.2:3000/api'),
      );

      final menu = await repository.getMenu('r1');

      expect(menu.single.name, 'Grilled Prawns');
    });

    test('getReviews() maps the review page response', () async {
      final mockClient = MockClient((request) async {
        expect(request.url.path, '/api/restaurants/r1/reviews');
        return http.Response(
          jsonEncode({
            'data': [
              {
                'id': 'rev1',
                'rating': 5,
                'comment': 'Great!',
                'user': {'name': 'Diner', 'avatarUrl': null},
                'createdAt': '2026-07-01T00:00:00.000Z',
              }
            ],
            'total': 1,
            'page': 1,
            'limit': 10,
            'avgRating': 5,
          }),
          200,
        );
      });
      final repository = ApiRestaurantRepository(
        ApiClient(client: mockClient, baseUrl: 'http://10.0.2.2:3000/api'),
      );

      final reviews = await repository.getReviews('r1');

      expect(reviews.data.single.userName, 'Diner');
      expect(reviews.avgRating, 5.0);
    });

    test('getPromotions() maps the promotion list', () async {
      final mockClient = MockClient((request) async {
        expect(request.url.path, '/api/restaurants/r1/promotions');
        return http.Response(
          jsonEncode([
            {
              'id': 'p1',
              'title': '20% off',
              'description': 'Weekday lunch',
              'type': 'DISCOUNT',
              'discountValue': 20,
            }
          ]),
          200,
        );
      });
      final repository = ApiRestaurantRepository(
        ApiClient(client: mockClient, baseUrl: 'http://10.0.2.2:3000/api'),
      );

      final promotions = await repository.getPromotions('r1');

      expect(promotions.single.title, '20% off');
    });
```

Also add these imports to the top of the test file, alongside the existing ones:

```dart
import 'package:restaurant_chatbot_mobile/features/restaurants/models/menu_item_model.dart';
import 'package:restaurant_chatbot_mobile/features/restaurants/models/promotion_model.dart';
import 'package:restaurant_chatbot_mobile/features/restaurants/models/review_model.dart';
```

- [ ] **Step 7: Run the test and verify the new cases fail**

```bash
flutter test test/features/restaurants/data/restaurant_repository_test.dart
```

Expected: the 3 new tests FAIL — `getMenu`/`getReviews`/`getPromotions` aren't defined on `RestaurantRepository`.

- [ ] **Step 8: Extend RestaurantRepository**

Modify `mobile/lib/features/restaurants/data/restaurant_repository.dart` — add these imports at the top:

```dart
import '../models/menu_item_model.dart';
import '../models/promotion_model.dart';
import '../models/review_model.dart';
```

Add these method signatures to the `abstract class RestaurantRepository`:

```dart
  Future<List<MenuItemModel>> getMenu(String restaurantId);
  Future<ReviewPage> getReviews(String restaurantId);
  Future<List<PromotionModel>> getPromotions(String restaurantId);
```

Add these implementations to `ApiRestaurantRepository`:

```dart
  @override
  Future<List<MenuItemModel>> getMenu(String restaurantId) async {
    final json = await _apiClient.get('/restaurants/$restaurantId/menu');
    return (json as List).map((e) => MenuItemModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  @override
  Future<ReviewPage> getReviews(String restaurantId) async {
    final json = await _apiClient.get('/restaurants/$restaurantId/reviews');
    return ReviewPage.fromJson(json as Map<String, dynamic>);
  }

  @override
  Future<List<PromotionModel>> getPromotions(String restaurantId) async {
    final json = await _apiClient.get('/restaurants/$restaurantId/promotions');
    return (json as List).map((e) => PromotionModel.fromJson(e as Map<String, dynamic>)).toList();
  }
```

- [ ] **Step 9: Run the test and verify it passes**

```bash
flutter test test/features/restaurants/data/restaurant_repository_test.dart
```

Expected: PASS (5 tests).

- [ ] **Step 10: Write the failing RestaurantDetailProvider test**

Create `mobile/test/features/restaurants/providers/restaurant_detail_provider_test.dart`:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:restaurant_chatbot_mobile/features/restaurants/data/restaurant_repository.dart';
import 'package:restaurant_chatbot_mobile/features/restaurants/models/menu_item_model.dart';
import 'package:restaurant_chatbot_mobile/features/restaurants/models/promotion_model.dart';
import 'package:restaurant_chatbot_mobile/features/restaurants/models/restaurant_model.dart';
import 'package:restaurant_chatbot_mobile/features/restaurants/models/review_model.dart';
import 'package:restaurant_chatbot_mobile/features/restaurants/providers/restaurant_detail_provider.dart';

class _FakeRestaurantRepository implements RestaurantRepository {
  bool shouldFail = false;

  @override
  Future<RestaurantPage> listRestaurants(RestaurantFilters filters) async => throw UnimplementedError();

  @override
  Future<RestaurantModel> getRestaurantById(String id) async {
    if (shouldFail) throw Exception('Restaurant not found');
    return const RestaurantModel(
      id: 'r1',
      name: 'Ocean Grill',
      address: '12 Marine Dr',
      area: 'Colombo 3',
      cuisineTypes: ['Seafood'],
      priceRange: 'MODERATE',
      imageUrls: [],
      isVerified: true,
      totalReviews: 12,
    );
  }

  @override
  Future<List<MenuItemModel>> getMenu(String restaurantId) async => const [
        MenuItemModel(id: 'm1', name: 'Grilled Prawns', price: 2500, category: 'Mains', dietaryInfo: []),
      ];

  @override
  Future<ReviewPage> getReviews(String restaurantId) async => const ReviewPage(
        data: [ReviewModel(id: 'rev1', rating: 5, comment: 'Great!', createdAt: '2026-07-01T00:00:00.000Z')],
        total: 1,
        avgRating: 5,
      );

  @override
  Future<List<PromotionModel>> getPromotions(String restaurantId) async => const [
        PromotionModel(id: 'p1', title: '20% off', description: 'Weekday lunch', type: 'DISCOUNT'),
      ];
}

void main() {
  group('RestaurantDetailProvider', () {
    test('load() populates restaurant, menu, reviews, and promotions together', () async {
      final provider = RestaurantDetailProvider(_FakeRestaurantRepository());

      await provider.load('r1');

      expect(provider.restaurant?.name, 'Ocean Grill');
      expect(provider.menu, hasLength(1));
      expect(provider.reviews?.data, hasLength(1));
      expect(provider.promotions, hasLength(1));
      expect(provider.isLoading, isFalse);
      expect(provider.error, isNull);
    });

    test('load() sets an error when any request fails', () async {
      final provider = RestaurantDetailProvider(_FakeRestaurantRepository()..shouldFail = true);

      await provider.load('r1');

      expect(provider.error, isNotNull);
      expect(provider.restaurant, isNull);
      expect(provider.isLoading, isFalse);
    });
  });
}
```

- [ ] **Step 11: Run the test and verify it fails**

```bash
flutter test test/features/restaurants/providers/restaurant_detail_provider_test.dart
```

Expected: FAIL — `RestaurantDetailProvider` doesn't exist.

- [ ] **Step 12: Implement RestaurantDetailProvider**

Create `mobile/lib/features/restaurants/providers/restaurant_detail_provider.dart`:

```dart
import 'package:flutter/foundation.dart';
import '../data/restaurant_repository.dart';
import '../models/menu_item_model.dart';
import '../models/promotion_model.dart';
import '../models/restaurant_model.dart';
import '../models/review_model.dart';

class RestaurantDetailProvider extends ChangeNotifier {
  final RestaurantRepository _repository;

  RestaurantDetailProvider(this._repository);

  RestaurantModel? restaurant;
  List<MenuItemModel> menu = [];
  ReviewPage? reviews;
  List<PromotionModel> promotions = [];
  bool isLoading = false;
  String? error;

  Future<void> load(String restaurantId) async {
    isLoading = true;
    error = null;
    notifyListeners();
    try {
      final results = await Future.wait([
        _repository.getRestaurantById(restaurantId),
        _repository.getMenu(restaurantId),
        _repository.getReviews(restaurantId),
        _repository.getPromotions(restaurantId),
      ]);
      restaurant = results[0] as RestaurantModel;
      menu = results[1] as List<MenuItemModel>;
      reviews = results[2] as ReviewPage;
      promotions = results[3] as List<PromotionModel>;
    } catch (e) {
      error = e.toString();
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }
}
```

- [ ] **Step 13: Run the test and verify it passes**

```bash
flutter test test/features/restaurants/providers/restaurant_detail_provider_test.dart
```

Expected: PASS (2 tests).

- [ ] **Step 14: Analyze, run the full suite, and commit**

```bash
flutter analyze
flutter test
git add lib/features/restaurants/models lib/features/restaurants/data lib/features/restaurants/providers/restaurant_detail_provider.dart test/features/restaurants/models test/features/restaurants/data test/features/restaurants/providers/restaurant_detail_provider_test.dart
git commit -m "feat(mobile): add menu/review/promotion fetching and RestaurantDetailProvider"
```

---

### Task 10: RestaurantDetailScreen

**Files:**
- Create: `mobile/lib/features/restaurants/screens/restaurant_detail_screen.dart`
- Test: `mobile/test/features/restaurants/screens/restaurant_detail_screen_test.dart`

**Interfaces:**
- Consumes: `RestaurantDetailProvider` (Task 9); `LoadingView`, `ErrorRetryView` (Task 8); `AppColors` (Task 1).
- Produces: `RestaurantDetailScreen({restaurantId})` — consumed by the router task.

The "Book a table" button is present (matching the web's CTA placement) but shows a "coming in a future update" message rather than navigating anywhere — the booking flow is Phase 2, not built yet. This avoids a dead route or a button that silently does nothing.

- [ ] **Step 1: Write the failing test**

Create `mobile/test/features/restaurants/screens/restaurant_detail_screen_test.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:restaurant_chatbot_mobile/features/restaurants/data/restaurant_repository.dart';
import 'package:restaurant_chatbot_mobile/features/restaurants/models/menu_item_model.dart';
import 'package:restaurant_chatbot_mobile/features/restaurants/models/promotion_model.dart';
import 'package:restaurant_chatbot_mobile/features/restaurants/models/restaurant_model.dart';
import 'package:restaurant_chatbot_mobile/features/restaurants/models/review_model.dart';
import 'package:restaurant_chatbot_mobile/features/restaurants/providers/restaurant_detail_provider.dart';
import 'package:restaurant_chatbot_mobile/features/restaurants/screens/restaurant_detail_screen.dart';

class _FakeRestaurantRepository implements RestaurantRepository {
  bool shouldFail = false;

  @override
  Future<RestaurantPage> listRestaurants(RestaurantFilters filters) async => throw UnimplementedError();

  @override
  Future<RestaurantModel> getRestaurantById(String id) async {
    if (shouldFail) throw Exception('Restaurant not found');
    return const RestaurantModel(
      id: 'r1',
      name: 'Ocean Grill',
      address: '12 Marine Dr',
      area: 'Colombo 3',
      cuisineTypes: ['Seafood'],
      priceRange: 'MODERATE',
      imageUrls: [],
      isVerified: true,
      totalReviews: 12,
      avgRating: 4.5,
    );
  }

  @override
  Future<List<MenuItemModel>> getMenu(String restaurantId) async => const [
        MenuItemModel(id: 'm1', name: 'Grilled Prawns', price: 2500, category: 'Mains', dietaryInfo: []),
      ];

  @override
  Future<ReviewPage> getReviews(String restaurantId) async => const ReviewPage(data: [], total: 0);

  @override
  Future<List<PromotionModel>> getPromotions(String restaurantId) async => const [];
}

Future<void> _pumpDetail(WidgetTester tester, RestaurantDetailProvider provider) async {
  await tester.pumpWidget(
    ChangeNotifierProvider.value(
      value: provider,
      child: const MaterialApp(home: RestaurantDetailScreen(restaurantId: 'r1')),
    ),
  );
}

void main() {
  testWidgets('shows restaurant info and menu once loaded', (tester) async {
    final provider = RestaurantDetailProvider(_FakeRestaurantRepository());
    await _pumpDetail(tester, provider);
    await tester.pumpAndSettle();

    expect(find.text('Ocean Grill'), findsWidgets);
    expect(find.text('Grilled Prawns'), findsOneWidget);
    expect(find.text('Book a table'), findsOneWidget);
  });

  testWidgets('shows a retry view on load failure', (tester) async {
    final provider = RestaurantDetailProvider(_FakeRestaurantRepository()..shouldFail = true);
    await _pumpDetail(tester, provider);
    await tester.pumpAndSettle();

    expect(find.text('Exception: Restaurant not found'), findsOneWidget);
  });

  testWidgets('tapping "Book a table" shows the coming-soon message', (tester) async {
    final provider = RestaurantDetailProvider(_FakeRestaurantRepository());
    await _pumpDetail(tester, provider);
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('book_table_button')));
    await tester.pump();

    expect(find.text('Booking will be available in the next update'), findsOneWidget);
  });
}
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
cd mobile && flutter test test/features/restaurants/screens/restaurant_detail_screen_test.dart
```

Expected: FAIL — `RestaurantDetailScreen` doesn't exist.

- [ ] **Step 3: Implement RestaurantDetailScreen**

Create `mobile/lib/features/restaurants/screens/restaurant_detail_screen.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/error_retry_view.dart';
import '../../../shared/widgets/loading_view.dart';
import '../providers/restaurant_detail_provider.dart';

class RestaurantDetailScreen extends StatefulWidget {
  final String restaurantId;

  const RestaurantDetailScreen({super.key, required this.restaurantId});

  @override
  State<RestaurantDetailScreen> createState() => _RestaurantDetailScreenState();
}

class _RestaurantDetailScreenState extends State<RestaurantDetailScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<RestaurantDetailProvider>().load(widget.restaurantId);
    });
  }

  @override
  Widget build(BuildContext context) {
    final detail = context.watch<RestaurantDetailProvider>();

    return Scaffold(
      appBar: AppBar(title: Text(detail.restaurant?.name ?? 'Restaurant')),
      body: Builder(builder: (context) {
        if (detail.isLoading && detail.restaurant == null) {
          return const LoadingView();
        }
        if (detail.error != null && detail.restaurant == null) {
          return ErrorRetryView(
            message: detail.error!,
            onRetry: () => detail.load(widget.restaurantId),
          );
        }
        final restaurant = detail.restaurant;
        if (restaurant == null) return const SizedBox.shrink();

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: SizedBox(
                height: 180,
                width: double.infinity,
                child: restaurant.coverImageUrl != null
                    ? Image.network(restaurant.coverImageUrl!, fit: BoxFit.cover)
                    : Container(color: AppColors.secondary),
              ),
            ),
            const SizedBox(height: 16),
            Text(restaurant.name, style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 4),
            Text(
              '${restaurant.address}, ${restaurant.area}',
              style: const TextStyle(color: AppColors.mutedForeground),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.star, color: AppColors.primary, size: 16),
                const SizedBox(width: 4),
                Text(
                  restaurant.avgRating != null
                      ? '${restaurant.avgRating!.toStringAsFixed(1)} (${restaurant.totalReviews} reviews)'
                      : 'No reviews yet',
                ),
              ],
            ),
            if (detail.promotions.isNotEmpty) ...[
              const SizedBox(height: 16),
              ...detail.promotions.map((promo) => Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.accent,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(promo.title, style: const TextStyle(fontWeight: FontWeight.w600)),
                        Text(promo.description, style: const TextStyle(color: AppColors.mutedForeground)),
                      ],
                    ),
                  )),
            ],
            const SizedBox(height: 16),
            Text('Menu', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            if (detail.menu.isEmpty)
              const Text('No menu items yet', style: TextStyle(color: AppColors.mutedForeground)),
            ...detail.menu.take(5).map((item) => ListTile(
                  key: Key('menu_item_${item.id}'),
                  contentPadding: EdgeInsets.zero,
                  title: Text(item.name),
                  subtitle: item.description != null ? Text(item.description!) : null,
                  trailing: Text('LKR ${item.price.toStringAsFixed(0)}'),
                )),
            const SizedBox(height: 16),
            Text('Reviews', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            if (detail.reviews == null || detail.reviews!.data.isEmpty)
              const Text('No reviews yet', style: TextStyle(color: AppColors.mutedForeground)),
            ...?detail.reviews?.data.take(3).map((review) => ListTile(
                  key: Key('review_${review.id}'),
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.star, color: AppColors.primary),
                  title: Text(review.userName ?? 'Diner'),
                  subtitle: Text(review.comment ?? ''),
                  trailing: Text('${review.rating}/5'),
                )),
            const SizedBox(height: 24),
            ElevatedButton(
              key: const Key('book_table_button'),
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Booking will be available in the next update')),
                );
              },
              child: const Text('Book a table'),
            ),
          ],
        );
      }),
    );
  }
}
```

- [ ] **Step 4: Run the test and verify it passes**

```bash
flutter test test/features/restaurants/screens/restaurant_detail_screen_test.dart
```

Expected: PASS (3 tests).

- [ ] **Step 5: Analyze and commit**

```bash
flutter analyze
git add lib/features/restaurants/screens/restaurant_detail_screen.dart test/features/restaurants/screens/restaurant_detail_screen_test.dart
git commit -m "feat(mobile): add RestaurantDetailScreen with menu/reviews/promotions"
```

---

### Task 11: Router, bottom-nav shell, and final app wiring

**Files:**
- Create: `mobile/lib/shared/widgets/coming_soon_screen.dart`
- Create: `mobile/lib/shared/widgets/app_shell.dart`
- Create: `mobile/lib/core/router/app_router.dart`
- Modify: `mobile/lib/main.dart` (full `MultiProvider` root)
- Test: `mobile/test/core/router/app_router_test.dart`

**Interfaces:**
- Consumes: everything from Tasks 1–10.
- Produces: `buildAppRouter(AuthProvider)`, `AppShell`, `ComingSoonScreen` — this is the final integration point; nothing later consumes these within Phase 1.

- [ ] **Step 1: Implement ComingSoonScreen**

Create `mobile/lib/shared/widgets/coming_soon_screen.dart`:

```dart
import 'package:flutter/material.dart';

class ComingSoonScreen extends StatelessWidget {
  final String title;

  const ComingSoonScreen({super.key, required this.title});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Center(
        child: Text('$title is coming in a future update', textAlign: TextAlign.center),
      ),
    );
  }
}
```

- [ ] **Step 2: Implement AppShell (bottom navigation)**

Create `mobile/lib/shared/widgets/app_shell.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class AppShell extends StatelessWidget {
  final Widget child;
  final String location;

  const AppShell({super.key, required this.child, required this.location});

  static const _tabs = [
    ('/home', Icons.home_outlined, 'Home'),
    ('/reservations', Icons.calendar_today_outlined, 'Reservations'),
    ('/chat', Icons.chat_bubble_outline, 'Chat'),
    ('/more', Icons.menu, 'More'),
  ];

  int get _currentIndex {
    final index = _tabs.indexWhere((tab) => location.startsWith(tab.$1));
    return index == -1 ? 0 : index;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) => context.go(_tabs[index].$1),
        destinations: _tabs
            .map((tab) => NavigationDestination(icon: Icon(tab.$2), label: tab.$3))
            .toList(),
      ),
    );
  }
}
```

- [ ] **Step 3: Write the failing router test**

Create `mobile/test/core/router/app_router_test.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:restaurant_chatbot_mobile/core/network/auth_token_holder.dart';
import 'package:restaurant_chatbot_mobile/core/router/app_router.dart';
import 'package:restaurant_chatbot_mobile/core/storage/token_storage.dart';
import 'package:restaurant_chatbot_mobile/features/auth/data/auth_repository.dart';
import 'package:restaurant_chatbot_mobile/features/auth/models/user_model.dart';
import 'package:restaurant_chatbot_mobile/features/auth/providers/auth_provider.dart';
import 'package:restaurant_chatbot_mobile/features/restaurants/data/restaurant_repository.dart';
import 'package:restaurant_chatbot_mobile/features/restaurants/models/restaurant_model.dart';
import 'package:restaurant_chatbot_mobile/features/restaurants/providers/restaurant_provider.dart';

class _FakeTokenStorage implements TokenStorage {
  String? _token;
  @override
  Future<void> save(String token) async => _token = token;
  @override
  Future<String?> read() async => _token;
  @override
  Future<void> clear() async => _token = null;
}

class _FakeAuthRepository implements AuthRepository {
  @override
  Future<String> signInWithEmail(String email, String password) async => 'token';
  @override
  Future<String> registerWithEmail(String email, String password, String name) async => 'token';
  @override
  Future<void> signOut() async {}
  @override
  Future<UserModel> fetchCurrentUser() async =>
      const UserModel(id: 'u1', firebaseUid: 'fb1', email: 'diner@example.com', role: 'CUSTOMER');
}

class _FakeRestaurantRepository implements RestaurantRepository {
  @override
  Future<RestaurantPage> listRestaurants(RestaurantFilters filters) async =>
      const RestaurantPage(data: [], total: 0, page: 1, limit: 20);
  @override
  Future<RestaurantModel> getRestaurantById(String id) async => throw UnimplementedError();
}

AuthProvider _buildAuthProvider(AuthStatus status) {
  final provider = AuthProvider(
    repository: _FakeAuthRepository(),
    tokenStorage: _FakeTokenStorage(),
    tokenHolder: AuthTokenHolder(),
  );
  provider.status = status;
  return provider;
}

Widget _buildTestApp(AuthProvider authProvider) {
  final restaurantRepository = _FakeRestaurantRepository();
  return MultiProvider(
    providers: [
      ChangeNotifierProvider.value(value: authProvider),
      Provider<RestaurantRepository>.value(value: restaurantRepository),
      ChangeNotifierProvider(
        create: (context) => RestaurantProvider(context.read<RestaurantRepository>()),
      ),
    ],
    child: MaterialApp.router(routerConfig: buildAppRouter(authProvider)),
  );
}

void main() {
  testWidgets('redirects to /login when unauthenticated', (tester) async {
    final authProvider = _buildAuthProvider(AuthStatus.unauthenticated);

    await tester.pumpWidget(_buildTestApp(authProvider));
    await tester.pumpAndSettle();

    expect(find.text('Sign in'), findsOneWidget);
  });

  testWidgets('redirects away from /login to /home when authenticated', (tester) async {
    final authProvider = _buildAuthProvider(AuthStatus.authenticated);

    await tester.pumpWidget(_buildTestApp(authProvider));
    await tester.pumpAndSettle();

    expect(find.text('Discover restaurants'), findsOneWidget);
  });

  testWidgets('bottom nav shell shows all 4 tabs when authenticated', (tester) async {
    final authProvider = _buildAuthProvider(AuthStatus.authenticated);

    await tester.pumpWidget(_buildTestApp(authProvider));
    await tester.pumpAndSettle();

    expect(find.text('Home'), findsOneWidget);
    expect(find.text('Reservations'), findsOneWidget);
    expect(find.text('Chat'), findsOneWidget);
    expect(find.text('More'), findsOneWidget);
  });
}
```

- [ ] **Step 4: Run the test and verify it fails**

```bash
cd mobile && flutter test test/core/router/app_router_test.dart
```

Expected: FAIL — `Target of URI doesn't exist: 'package:restaurant_chatbot_mobile/core/router/app_router.dart'`.

- [ ] **Step 5: Implement the router**

Create `mobile/lib/core/router/app_router.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/register_screen.dart';
import '../../features/restaurants/data/restaurant_repository.dart';
import '../../features/restaurants/providers/restaurant_detail_provider.dart';
import '../../features/restaurants/screens/home_screen.dart';
import '../../features/restaurants/screens/restaurant_detail_screen.dart';
import '../../shared/widgets/app_shell.dart';
import '../../shared/widgets/coming_soon_screen.dart';

GoRouter buildAppRouter(AuthProvider authProvider) {
  return GoRouter(
    initialLocation: '/home',
    refreshListenable: authProvider,
    redirect: (context, state) {
      if (authProvider.status == AuthStatus.unknown) return null;

      final loggedIn = authProvider.status == AuthStatus.authenticated;
      final loggingIn = state.matchedLocation == '/login' || state.matchedLocation == '/register';

      if (!loggedIn && !loggingIn) return '/login';
      if (loggedIn && loggingIn) return '/home';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(path: '/register', builder: (context, state) => const RegisterScreen()),
      ShellRoute(
        builder: (context, state, child) => AppShell(location: state.matchedLocation, child: child),
        routes: [
          GoRoute(path: '/home', builder: (context, state) => const HomeScreen()),
          GoRoute(
            path: '/reservations',
            builder: (context, state) => const ComingSoonScreen(title: 'Reservations'),
          ),
          GoRoute(
            path: '/chat',
            builder: (context, state) => const ComingSoonScreen(title: 'Chat'),
          ),
          GoRoute(
            path: '/more',
            builder: (context, state) => const ComingSoonScreen(title: 'More'),
          ),
        ],
      ),
      GoRoute(
        path: '/restaurants/:id',
        builder: (context, state) => ChangeNotifierProvider(
          create: (_) => RestaurantDetailProvider(context.read<RestaurantRepository>()),
          child: RestaurantDetailScreen(restaurantId: state.pathParameters['id']!),
        ),
      ),
    ],
  );
}
```

- [ ] **Step 6: Run the test and verify it passes**

```bash
flutter test test/core/router/app_router_test.dart
```

Expected: PASS (3 tests).

- [ ] **Step 7: Wire the full MultiProvider root into main.dart**

Replace the contents of `mobile/lib/main.dart`:

```dart
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/firebase/firebase_options_dummy.dart';
import 'core/network/api_client.dart';
import 'core/network/auth_token_holder.dart';
import 'core/router/app_router.dart';
import 'core/storage/token_storage.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/data/auth_repository.dart';
import 'features/auth/providers/auth_provider.dart';
import 'features/restaurants/data/restaurant_repository.dart';
import 'features/restaurants/providers/restaurant_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DummyFirebaseOptions.android);
  runApp(const RestaurantChatbotApp());
}

class RestaurantChatbotApp extends StatelessWidget {
  const RestaurantChatbotApp({super.key});

  @override
  Widget build(BuildContext context) {
    final tokenHolder = AuthTokenHolder();
    final tokenStorage = SecureTokenStorage();
    final apiClient = ApiClient(tokenProvider: () => tokenHolder.token);
    final restaurantRepository = ApiRestaurantRepository(apiClient);

    return MultiProvider(
      providers: [
        Provider<TokenStorage>.value(value: tokenStorage),
        Provider<ApiClient>.value(value: apiClient),
        Provider<RestaurantRepository>.value(value: restaurantRepository),
        ChangeNotifierProvider<AuthProvider>(
          create: (_) => AuthProvider(
            repository: FirebaseAuthRepository(apiClient: apiClient),
            tokenStorage: tokenStorage,
            tokenHolder: tokenHolder,
          )..restoreSession(),
        ),
        ChangeNotifierProvider<RestaurantProvider>(
          create: (context) => RestaurantProvider(context.read<RestaurantRepository>()),
        ),
      ],
      child: Consumer<AuthProvider>(
        builder: (context, authProvider, _) {
          return MaterialApp.router(
            title: 'Restaurant Chatbot',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.dark,
            routerConfig: buildAppRouter(authProvider),
          );
        },
      ),
    );
  }
}
```

- [ ] **Step 8: Analyze and run the full test suite**

```bash
flutter analyze
flutter test
```

Expected: no analyzer issues, all tests across every task passing.

- [ ] **Step 9: Commit**

```bash
git add lib/shared/widgets/coming_soon_screen.dart lib/shared/widgets/app_shell.dart lib/core/router lib/main.dart test/core/router
git commit -m "feat(mobile): wire router, bottom-nav shell, and app-wide providers"
```

- [ ] **Step 10: Manual verification on an Android emulator**

With the backend running locally (`cd backend && npm run dev`, confirm it's on port 3000) and an Android emulator booted:

```bash
cd mobile && flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000/api
```

Confirm, and note any deviation found:
1. App launches into the dark AgentDine theme (no light mode, orange primary, correct background gradient feel)
2. Since no token is stored yet, the app redirects to the Login screen
3. Login/Register screens render with correct copy, field labels, and validation errors on empty submit
4. Attempting to sign in with dummy Firebase config fails with a visible error message (expected — no real Firebase project yet); this is not a defect
5. Manually bypass auth for this check only by temporarily setting `authProvider.status = AuthStatus.authenticated` in a debug print, or by pointing `DummyFirebaseOptions` at a real (even free-tier) Firebase project temporarily, to confirm: bottom-nav shell shows 4 tabs, Home loads the live restaurant list from the local backend, search and price-range filters refetch the list, tapping a card opens the detail screen with live menu/reviews/promotions, and "Book a table" shows the coming-soon snackbar
6. Reservations/Chat/More tabs show their "coming in a future update" placeholder

Record the outcome of this manual pass in the PR description or commit message when this phase is wrapped up.

---

## Self-review notes

- **Spec coverage**: every Phase 1 bullet in `docs/superpowers/specs/2026-07-14-flutter-mobile-app-design.md` maps to a task — scaffold/theme (Task 1), ApiClient (Task 2), token storage (Task 3), auth data + screens (Tasks 4–5), bottom-nav shell (Task 11), Home/discovery (Tasks 6–8), restaurant detail (Tasks 9–10), router/auth-guard (Task 11).
- **Deviation from spec**: Google sign-in is dropped from Phase 1 (see Global Constraints) — it cannot function against a dummy Firebase config and a dead button is worse than omitting it.
- **New design decision made during planning, not in the original spec**: `AuthTokenHolder` (Task 4) — the spec didn't specify how `ApiClient`'s synchronous token lookup would get the token out of async `TokenStorage`; this closes that gap with a small in-memory holder kept in sync by `AuthProvider`.
- **Type consistency checked**: `AuthRepository`/`RestaurantRepository` method signatures are identical everywhere they're implemented (real + fakes) across Tasks 4–11; `AuthProvider`'s constructor signature (`repository`, `tokenStorage`, `tokenHolder`) is consistent in Task 4's own test and reused unchanged in Tasks 5 and 11's tests.

## Post-implementation: final whole-branch review findings

A final whole-branch review (after all 11 tasks + the Task 11 router-rebuild fix) found two Important gaps, both fixed in a follow-up commit before this phase was considered done:

- **Android `minSdk`**: left at Flutter's default (`flutter.minSdkVersion`) through Task 11, but `firebase_core`/`firebase_auth` require API 23+. Raised explicitly to `minSdk = 23` in `mobile/android/app/build.gradle.kts` — this was the single most likely first-run build failure, since nothing in this branch had been compiled at any point during execution (tests/lint were waived for the whole build).
- **Global 401 handling**: the spec (`docs/superpowers/specs/2026-07-14-flutter-mobile-app-design.md`) states a 401 should clear the token and redirect to `/login`, but no task actually wired this up — it had no observable effect in Phase 1 (the only authenticated call, `/auth/me` during `restoreSession`, already self-heals on failure) but would have been a silent gap once Phase 2 adds authenticated booking calls. Added a mutable `ApiClient.onUnauthorized` callback, invoked on any 401 response, wired in `main.dart` to `authProvider.signOut` (assigned after `authProvider` is constructed, since `apiClient` must exist first to build `authProvider`'s repository).

One additional deviation the review surfaced, left as-is (not a fix, an intentional Phase 1 scope note): **Home only exposes a price-range filter**, not the full cuisine/area/rating set the spec's Home description lists. The data layer (`RestaurantFilters`) and backend both support all four — this is a UI subset for Phase 1, not a contract gap, and can be widened without touching `RestaurantProvider`/`RestaurantRepository` when a later phase wants it.
