# Mobile Chat Clone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clone the web app's AI chat widget into the Flutter mobile app, replacing the `ComingSoonScreen` placeholder at the bottom-nav `/chat` tab.

**Architecture:** New `lib/features/chat/` module following the existing repository → provider → screen/widgets layering used by `lib/features/auth` and `lib/features/restaurants`. `ChatProvider` is created once in `main.dart`'s `MultiProvider` (like `AuthProvider`/`RestaurantProvider`) so conversation state survives bottom-nav tab switches, resetting only on app restart.

**Tech Stack:** Flutter/Dart, `provider` (state), existing `ApiClient` (bearer-authed HTTP), `go_router` (navigation), new deps: `uuid`, `flutter_markdown_plus`, `url_launcher`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-25-mobile-chat-clone-design.md` — read it before starting if anything below is unclear.
- **No automated tests in this plan.** The mobile project currently has zero test files anywhere (`test/` is empty, no `mockito`/`mocktail` dependency), and the user explicitly said "no tests needed" earlier in this same work session for the sibling auth feature. Each task instead ends with `flutter analyze` (must report no new issues) and the final task is a manual on-device verification pass. Do not add test files or test dependencies as part of this plan.
- Package versions are pre-resolved (via `flutter pub add --dry-run` against this exact `pubspec.lock`) — use exactly: `uuid: ^4.5.2`, `flutter_markdown_plus: ^1.0.12`, `url_launcher: ^6.3.2`. Do not substitute other markdown/uuid/launcher packages.
- Follow existing code style: `AppColors` constants from `lib/core/theme/app_colors.dart` for all colors (no hardcoded hex outside that file, except plain `Colors.green` for the payment button which has no existing app-color equivalent — matches the web's hardcoded green-500/600/700 for that one element).
- Restaurant navigation uses `context.push('/restaurants/${id}')` (existing convention in `lib/features/restaurants/screens/home_screen.dart:105`), not `context.go`.
- The backend restaurant-search chat response's `cuisineTypes` and `imageUrls` are **JSON-encoded strings**, not arrays (raw DB columns via a direct SQL query in the AI service) — different from `GET /restaurants`. Do not reuse `RestaurantModel` for chat cards; use the new `ChatRestaurantResult` model instead (Task 2).

---

### Task 1: Add dependencies

**Files:**
- Modify: `mobile/pubspec.yaml`

**Interfaces:**
- Produces: `uuid`, `flutter_markdown_plus`, `url_launcher` packages available for import in later tasks.

- [ ] **Step 1: Add the three dependencies**

In `mobile/pubspec.yaml`, in the `dependencies:` block, add these three lines after `flutter_animate: ^4.5.2`:

```yaml
  uuid: ^4.5.2
  flutter_markdown_plus: ^1.0.12
  url_launcher: ^6.3.2
```

- [ ] **Step 2: Resolve and verify**

Run: `cd mobile && flutter pub get`
Expected: completes with `Got dependencies!` and no version-solving error. Then run `flutter analyze` — expected: no new issues (only the pre-existing `lib/core/router/app_router.dart:1:8` unused-import warning, if still present).

- [ ] **Step 3: Commit**

```bash
cd mobile
git add pubspec.yaml pubspec.lock
git commit -m "chore(mobile): add uuid, flutter_markdown_plus, url_launcher for chat feature"
```

---

### Task 2: `ChatRestaurantResult` model

**Files:**
- Create: `mobile/lib/features/chat/models/chat_restaurant_result.dart`

**Interfaces:**
- Consumes: nothing.
- Produces: `class ChatRestaurantResult` with fields `id, name, description (String?), address, area, cuisineTypes (String), priceRange (String), avgRating (double?), imageUrls (String)`, factory `ChatRestaurantResult.fromJson(Map<String, dynamic>)`, getter `List<String> get cuisineList`.

- [ ] **Step 1: Write the model**

```dart
import 'dart:convert';

class ChatRestaurantResult {
  final String id;
  final String name;
  final String? description;
  final String address;
  final String area;
  final String cuisineTypes;
  final String priceRange;
  final double? avgRating;
  final String imageUrls;

  const ChatRestaurantResult({
    required this.id,
    required this.name,
    required this.address,
    required this.area,
    required this.cuisineTypes,
    required this.priceRange,
    required this.imageUrls,
    this.description,
    this.avgRating,
  });

  factory ChatRestaurantResult.fromJson(Map<String, dynamic> json) {
    return ChatRestaurantResult(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      address: json['address'] as String,
      area: json['area'] as String,
      cuisineTypes: json['cuisineTypes'] as String? ?? '[]',
      priceRange: json['priceRange'] as String,
      avgRating: (json['avgRating'] as num?)?.toDouble(),
      imageUrls: json['imageUrls'] as String? ?? '[]',
    );
  }

  /// `cuisineTypes` is a JSON-encoded string column from the DB (e.g.
  /// `["Seafood","Sri Lankan"]`). Falls back to treating the raw string as a
  /// single cuisine if it isn't valid JSON — same fallback the web client uses.
  List<String> get cuisineList {
    try {
      final decoded = jsonDecode(cuisineTypes);
      if (decoded is List) return decoded.map((e) => e.toString()).toList();
      return [cuisineTypes];
    } catch (_) {
      return [cuisineTypes];
    }
  }
}
```

- [ ] **Step 2: Verify**

Run: `cd mobile && flutter analyze`
Expected: no new issues.

- [ ] **Step 3: Commit**

```bash
cd mobile
git add lib/features/chat/models/chat_restaurant_result.dart
git commit -m "feat(mobile): add ChatRestaurantResult model for chat restaurant cards"
```

---

### Task 3: `ChatMessageModel`

**Files:**
- Create: `mobile/lib/features/chat/models/chat_message_model.dart`

**Interfaces:**
- Consumes: `ChatRestaurantResult` (Task 2), import `'chat_restaurant_result.dart'`.
- Produces: `enum ChatRole { user, assistant }`, `class ChatMessageModel` with fields `id (String), role (ChatRole), content (String), data (List<ChatRestaurantResult>?), timestamp (DateTime)` and getter `bool get isUser`.

- [ ] **Step 1: Write the model**

```dart
import 'chat_restaurant_result.dart';

enum ChatRole { user, assistant }

class ChatMessageModel {
  final String id;
  final ChatRole role;
  final String content;
  final List<ChatRestaurantResult>? data;
  final DateTime timestamp;

  const ChatMessageModel({
    required this.id,
    required this.role,
    required this.content,
    required this.timestamp,
    this.data,
  });

  bool get isUser => role == ChatRole.user;
}
```

- [ ] **Step 2: Verify**

Run: `cd mobile && flutter analyze`
Expected: no new issues.

- [ ] **Step 3: Commit**

```bash
cd mobile
git add lib/features/chat/models/chat_message_model.dart
git commit -m "feat(mobile): add ChatMessageModel"
```

---

### Task 4: `ChatRepository`

**Files:**
- Create: `mobile/lib/features/chat/data/chat_repository.dart`

**Interfaces:**
- Consumes: `ApiClient` (`mobile/lib/core/network/api_client.dart`, has `Future<dynamic> post(String path, {Object? body})`), `ChatRestaurantResult` (Task 2).
- Produces: `class ChatHistoryEntry { role, content }` with `toJson()`; `class ChatSendResult { message (String), data (List<ChatRestaurantResult>?) }`; `abstract class ChatRepository` with `Future<ChatSendResult> sendMessage({required String message, required String sessionId, required List<ChatHistoryEntry> history})`; `class ApiChatRepository implements ChatRepository`.

- [ ] **Step 1: Write the repository**

```dart
import '../../../core/network/api_client.dart';
import '../models/chat_restaurant_result.dart';

class ChatHistoryEntry {
  final String role;
  final String content;

  const ChatHistoryEntry({required this.role, required this.content});

  Map<String, dynamic> toJson() => {'role': role, 'content': content};
}

class ChatSendResult {
  final String message;
  final List<ChatRestaurantResult>? data;

  const ChatSendResult({required this.message, this.data});
}

abstract class ChatRepository {
  Future<ChatSendResult> sendMessage({
    required String message,
    required String sessionId,
    required List<ChatHistoryEntry> history,
  });
}

class ApiChatRepository implements ChatRepository {
  final ApiClient _apiClient;

  ApiChatRepository(this._apiClient);

  @override
  Future<ChatSendResult> sendMessage({
    required String message,
    required String sessionId,
    required List<ChatHistoryEntry> history,
  }) async {
    final json = await _apiClient.post('/chat/message', body: {
      'message': message,
      'sessionId': sessionId,
      'history': history.map((h) => h.toJson()).toList(),
    }) as Map<String, dynamic>;

    final rawData = json['data'];
    List<ChatRestaurantResult>? parsedData;
    if (rawData is List) {
      parsedData = rawData
          .whereType<Map<String, dynamic>>()
          .map(ChatRestaurantResult.fromJson)
          .toList();
    }

    return ChatSendResult(message: json['message'] as String, data: parsedData);
  }
}
```

- [ ] **Step 2: Verify**

Run: `cd mobile && flutter analyze`
Expected: no new issues.

- [ ] **Step 3: Commit**

```bash
cd mobile
git add lib/features/chat/data/chat_repository.dart
git commit -m "feat(mobile): add ChatRepository calling POST /chat/message"
```

---

### Task 5: `ChatProvider`

**Files:**
- Create: `mobile/lib/features/chat/providers/chat_provider.dart`

**Interfaces:**
- Consumes: `ChatRepository`, `ChatHistoryEntry` (Task 4); `ChatMessageModel`, `ChatRole` (Task 3); `package:uuid/uuid.dart`.
- Produces: `class ChatProvider extends ChangeNotifier` with constructor `ChatProvider(ChatRepository repository)`, fields `String sessionId`, `List<ChatMessageModel> messages`, `bool loading`, methods `Future<void> sendMessage(String content)` and `void clearConversation()`.

- [ ] **Step 1: Write the provider**

```dart
import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';
import '../data/chat_repository.dart';
import '../models/chat_message_model.dart';

const _restaurantListSentinel = '__RESTAURANT_LIST__';

class ChatProvider extends ChangeNotifier {
  final ChatRepository _repository;
  final _uuid = const Uuid();

  ChatProvider(this._repository) : sessionId = const Uuid().v4();

  String sessionId;
  List<ChatMessageModel> messages = [];
  bool loading = false;
  final List<ChatHistoryEntry> _history = [];

  Future<void> sendMessage(String content) async {
    final userMessage = ChatMessageModel(
      id: _uuid.v4(),
      role: ChatRole.user,
      content: content,
      timestamp: DateTime.now(),
    );
    messages = [...messages, userMessage];
    loading = true;
    notifyListeners();

    _history.add(ChatHistoryEntry(role: 'user', content: content));

    try {
      final result = await _repository.sendMessage(
        message: content,
        sessionId: sessionId,
        history: List.of(_history),
      );

      final assistantMessage = ChatMessageModel(
        id: _uuid.v4(),
        role: ChatRole.assistant,
        content: result.message,
        data: result.data,
        timestamp: DateTime.now(),
      );
      messages = [...messages, assistantMessage];

      // Store a meaningful summary in history so the model remembers what was shown.
      var historyContent = result.message;
      if (result.message == _restaurantListSentinel &&
          result.data != null &&
          result.data!.isNotEmpty) {
        final names = result.data!.map((r) => r.name).join(', ');
        historyContent = 'Here are the restaurants I found: $names';
      }
      _history.add(ChatHistoryEntry(role: 'assistant', content: historyContent));
    } catch (_) {
      final errorMessage = ChatMessageModel(
        id: _uuid.v4(),
        role: ChatRole.assistant,
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: DateTime.now(),
      );
      messages = [...messages, errorMessage];
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  void clearConversation() {
    messages = [];
    _history.clear();
    sessionId = _uuid.v4();
    notifyListeners();
  }
}
```

- [ ] **Step 2: Verify**

Run: `cd mobile && flutter analyze`
Expected: no new issues.

- [ ] **Step 3: Commit**

```bash
cd mobile
git add lib/features/chat/providers/chat_provider.dart
git commit -m "feat(mobile): add ChatProvider mirroring web's useChat hook"
```

---

### Task 6: Typing indicator widget

**Files:**
- Create: `mobile/lib/features/chat/widgets/chat_typing_indicator.dart`

**Interfaces:**
- Consumes: `AppColors` (`mobile/lib/core/theme/app_colors.dart`).
- Produces: `class ChatTypingIndicator extends StatefulWidget` (no constructor params besides `key`).

- [ ] **Step 1: Write the widget**

```dart
import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';

class ChatTypingIndicator extends StatefulWidget {
  const ChatTypingIndicator({super.key});

  @override
  State<ChatTypingIndicator> createState() => _ChatTypingIndicatorState();
}

class _ChatTypingIndicatorState extends State<ChatTypingIndicator>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        const CircleAvatar(
          radius: 14,
          backgroundColor: AppColors.muted,
          child: Text(
            'AI',
            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.mutedForeground),
          ),
        ),
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: AppColors.muted,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: List.generate(3, _buildDot),
          ),
        ),
      ],
    );
  }

  Widget _buildDot(int index) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final t = (_controller.value - index * 0.2) % 1.0;
        final opacity = (t < 0.5 ? 0.3 + t : 0.3 + (1 - t)).clamp(0.3, 1.0);
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 2),
          child: Opacity(
            opacity: opacity,
            child: Container(
              width: 8,
              height: 8,
              decoration: const BoxDecoration(color: AppColors.mutedForeground, shape: BoxShape.circle),
            ),
          ),
        );
      },
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
git add lib/features/chat/widgets/chat_typing_indicator.dart
git commit -m "feat(mobile): add chat typing indicator widget"
```

---

### Task 7: Restaurant card widgets

**Files:**
- Create: `mobile/lib/features/chat/widgets/chat_restaurant_card.dart`

**Interfaces:**
- Consumes: `ChatRestaurantResult` (Task 2), `AppColors`, `go_router`'s `context.push`.
- Produces: `class ChatRestaurantList extends StatelessWidget` (`{required List<ChatRestaurantResult> items}`), `class ChatRestaurantCard extends StatelessWidget` (`{required ChatRestaurantResult restaurant}`).

- [ ] **Step 1: Write the widgets**

```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../models/chat_restaurant_result.dart';

const _priceLabels = {
  'BUDGET': 'Budget',
  'MODERATE': 'Moderate',
  'EXPENSIVE': 'Expensive',
  'FINE_DINING': 'Fine Dining',
};

class ChatRestaurantList extends StatelessWidget {
  final List<ChatRestaurantResult> items;

  const ChatRestaurantList({super.key, required this.items});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 6, left: 4),
          child: Text(
            'Found ${items.length} restaurant${items.length != 1 ? 's' : ''}',
            style: const TextStyle(color: AppColors.mutedForeground, fontSize: 12),
          ),
        ),
        ...items.map((r) => ChatRestaurantCard(restaurant: r)),
      ],
    );
  }
}

class ChatRestaurantCard extends StatelessWidget {
  final ChatRestaurantResult restaurant;

  const ChatRestaurantCard({super.key, required this.restaurant});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () => context.push('/restaurants/${restaurant.id}'),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        restaurant.name,
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                      ),
                    ),
                    if (restaurant.avgRating != null) ...[
                      const Icon(Icons.star, color: AppColors.primary, size: 13),
                      const SizedBox(width: 2),
                      Text(
                        restaurant.avgRating!.toStringAsFixed(1),
                        style: const TextStyle(color: AppColors.primary, fontSize: 12),
                      ),
                    ],
                    const SizedBox(width: 4),
                    const Icon(Icons.chevron_right, size: 16, color: AppColors.mutedForeground),
                  ],
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.location_on_outlined, size: 13, color: AppColors.mutedForeground),
                    const SizedBox(width: 3),
                    Text(restaurant.area, style: const TextStyle(color: AppColors.mutedForeground, fontSize: 12)),
                    const Text(' · ', style: TextStyle(color: AppColors.mutedForeground, fontSize: 12)),
                    Text(
                      _priceLabels[restaurant.priceRange] ?? restaurant.priceRange,
                      style: const TextStyle(color: AppColors.mutedForeground, fontSize: 12),
                    ),
                  ],
                ),
                if (restaurant.cuisineList.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: restaurant.cuisineList
                        .map((c) => Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(c, style: const TextStyle(color: AppColors.primary, fontSize: 10)),
                            ))
                        .toList(),
                  ),
                ],
                if (restaurant.description != null && restaurant.description!.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(
                    restaurant.description!,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: AppColors.mutedForeground, fontSize: 12, height: 1.3),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
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
git add lib/features/chat/widgets/chat_restaurant_card.dart
git commit -m "feat(mobile): add chat restaurant card/list widgets"
```

---

### Task 8: Payment link extraction + button

**Files:**
- Create: `mobile/lib/features/chat/widgets/chat_payment_button.dart`

**Interfaces:**
- Consumes: `AppColors`, `package:url_launcher/url_launcher.dart`.
- Produces: `class ExtractedPayment { displayText (String), paymentUrl (String?) }`, top-level function `ExtractedPayment extractPayment(String content)`, `class ChatPaymentButton extends StatelessWidget` (`{required String url}`).

- [ ] **Step 1: Write the extraction logic and button**

```dart
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/theme/app_colors.dart';

const _paymentLinkMarker = 'Payment link:';
final _stripeUrlPattern = RegExp(r'https://checkout\.stripe\.com/[^\s<>"]+');

class ExtractedPayment {
  final String displayText;
  final String? paymentUrl;

  const ExtractedPayment({required this.displayText, this.paymentUrl});
}

/// Mirrors the web's `extractPaymentUrl` + payment-link stripping in
/// `MessageText` (frontend/src/components/chat/MessageBubble.tsx).
ExtractedPayment extractPayment(String content) {
  String? url;
  final markerIndex = content.indexOf(_paymentLinkMarker);
  if (markerIndex != -1) {
    final afterMarker = content.substring(markerIndex + _paymentLinkMarker.length).trim();
    final candidate = afterMarker.split(RegExp(r'\s')).first.replaceAll(RegExp(r'[.,)]$'), '');
    if (candidate.startsWith('http')) url = candidate;
  }
  url ??= _stripeUrlPattern.firstMatch(content)?.group(0);

  if (url == null) return ExtractedPayment(displayText: content);

  var displayText = content;
  if (content.contains(_paymentLinkMarker)) {
    final markerIdx = content.indexOf(_paymentLinkMarker);
    final before = content.substring(0, markerIdx).trimRight();
    final afterIdx = markerIdx + _paymentLinkMarker.length + url.length;
    final after = afterIdx <= content.length ? content.substring(afterIdx).trimLeft() : '';
    displayText = [before, after].where((s) => s.isNotEmpty).join('\n').trim();
  }

  return ExtractedPayment(displayText: displayText, paymentUrl: url);
}

class ChatPaymentButton extends StatelessWidget {
  final String url;

  const ChatPaymentButton({super.key, required this.url});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.green.withValues(alpha: 0.06),
        border: Border.all(color: Colors.green.withValues(alpha: 0.3)),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          const Row(
            children: [
              Icon(Icons.credit_card, color: Colors.green, size: 18),
              SizedBox(width: 8),
              Text('Secure Payment Ready', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            ],
          ),
          const SizedBox(height: 6),
          const Text(
            'Tap below to complete your payment securely via Stripe. Link is valid for 24 hours.',
            style: TextStyle(color: AppColors.mutedForeground, fontSize: 11.5),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green.shade700,
                foregroundColor: Colors.white,
              ),
              onPressed: () => launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication),
              icon: const Icon(Icons.credit_card, size: 16),
              label: const Text('Pay Now'),
            ),
          ),
        ],
      ),
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
git add lib/features/chat/widgets/chat_payment_button.dart
git commit -m "feat(mobile): add payment link extraction and Pay Now button"
```

---

### Task 9: Message bubble widget

**Files:**
- Create: `mobile/lib/features/chat/widgets/chat_message_bubble.dart`

**Interfaces:**
- Consumes: `ChatMessageModel`, `ChatRole` (Task 3); `ChatRestaurantList` (Task 7); `extractPayment`, `ChatPaymentButton` (Task 8); `package:flutter_markdown_plus/flutter_markdown_plus.dart`; `package:url_launcher/url_launcher.dart`.
- Produces: `class ChatMessageBubble extends StatelessWidget` (`{required ChatMessageModel message}`).

- [ ] **Step 1: Write the widget**

```dart
import 'package:flutter/material.dart';
import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/theme/app_colors.dart';
import '../models/chat_message_model.dart';
import 'chat_payment_button.dart';
import 'chat_restaurant_card.dart';

const _restaurantListSentinel = '__RESTAURANT_LIST__';

class ChatMessageBubble extends StatelessWidget {
  final ChatMessageModel message;

  const ChatMessageBubble({super.key, required this.message});

  @override
  Widget build(BuildContext context) {
    final isRestaurantList = message.content == _restaurantListSentinel &&
        message.data != null &&
        message.data!.isNotEmpty;

    if (isRestaurantList) {
      return Align(
        alignment: Alignment.centerLeft,
        child: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.86),
          child: ChatRestaurantList(items: message.data!),
        ),
      );
    }

    return Row(
      mainAxisAlignment: message.isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        if (!message.isUser) ...[
          const CircleAvatar(
            radius: 14,
            backgroundColor: AppColors.muted,
            child: Text(
              'AI',
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.mutedForeground),
            ),
          ),
          const SizedBox(width: 8),
        ],
        Flexible(
          child: Container(
            constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: message.isUser ? AppColors.primary : AppColors.muted,
              borderRadius: BorderRadius.only(
                topLeft: const Radius.circular(16),
                topRight: const Radius.circular(16),
                bottomLeft: Radius.circular(message.isUser ? 16 : 4),
                bottomRight: Radius.circular(message.isUser ? 4 : 16),
              ),
            ),
            child: message.isUser
                ? Text(message.content, style: const TextStyle(color: AppColors.foreground, fontSize: 14))
                : _AssistantMessageText(content: message.content),
          ),
        ),
        if (message.isUser) const SizedBox(width: 8),
        if (message.isUser)
          const CircleAvatar(
            radius: 14,
            backgroundColor: AppColors.primary,
            child: Text(
              'U',
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.foreground),
            ),
          ),
      ],
    );
  }
}

class _AssistantMessageText extends StatelessWidget {
  final String content;

  const _AssistantMessageText({required this.content});

  @override
  Widget build(BuildContext context) {
    final extracted = extractPayment(content);
    final styleSheet = MarkdownStyleSheet.fromTheme(Theme.of(context)).copyWith(
      p: const TextStyle(color: AppColors.foreground, fontSize: 14, height: 1.4),
      strong: const TextStyle(
        color: AppColors.foreground, fontSize: 14, fontWeight: FontWeight.bold, height: 1.4),
      em: const TextStyle(
        color: AppColors.foreground, fontSize: 14, fontStyle: FontStyle.italic, height: 1.4),
      listBullet: const TextStyle(color: AppColors.foreground, fontSize: 14),
      h1: const TextStyle(color: AppColors.foreground, fontSize: 16, fontWeight: FontWeight.bold),
      h2: const TextStyle(color: AppColors.foreground, fontSize: 15, fontWeight: FontWeight.bold),
      h3: const TextStyle(color: AppColors.foreground, fontSize: 14, fontWeight: FontWeight.w600),
      a: const TextStyle(color: AppColors.primary, decoration: TextDecoration.underline),
      code: const TextStyle(
        color: AppColors.foreground,
        backgroundColor: AppColors.background,
        fontSize: 12,
        fontFamily: 'monospace',
      ),
      blockSpacing: 6,
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        MarkdownBody(
          data: extracted.displayText,
          styleSheet: styleSheet,
          onTapLink: (text, href, title) {
            if (href != null) launchUrl(Uri.parse(href), mode: LaunchMode.externalApplication);
          },
        ),
        if (extracted.paymentUrl != null) ChatPaymentButton(url: extracted.paymentUrl!),
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
git add lib/features/chat/widgets/chat_message_bubble.dart
git commit -m "feat(mobile): add chat message bubble with markdown + payment/restaurant rendering"
```

---

### Task 10: Chat input widget

**Files:**
- Create: `mobile/lib/features/chat/widgets/chat_input.dart`

**Interfaces:**
- Consumes: `AppColors`.
- Produces: `class ChatInput extends StatefulWidget` (`{required ValueChanged<String> onSend, required bool disabled}`).

- [ ] **Step 1: Write the widget**

```dart
import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';

class ChatInput extends StatefulWidget {
  final ValueChanged<String> onSend;
  final bool disabled;

  const ChatInput({super.key, required this.onSend, required this.disabled});

  @override
  State<ChatInput> createState() => _ChatInputState();
}

class _ChatInputState extends State<ChatInput> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _submit() {
    final text = _controller.text.trim();
    if (text.isEmpty || widget.disabled) return;
    widget.onSend(text);
    _controller.clear();
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(
          child: TextField(
            controller: _controller,
            enabled: !widget.disabled,
            minLines: 1,
            maxLines: 4,
            textInputAction: TextInputAction.send,
            onSubmitted: (_) => _submit(),
            decoration: const InputDecoration(
              hintText: 'Ask about restaurants, get recommendations, or book a table…',
            ),
          ),
        ),
        const SizedBox(width: 8),
        IconButton.filled(
          onPressed: widget.disabled ? null : _submit,
          icon: const Icon(Icons.send),
          style: IconButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: AppColors.foreground,
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
git add lib/features/chat/widgets/chat_input.dart
git commit -m "feat(mobile): add chat input widget"
```

---

### Task 11: Chat screen

**Files:**
- Create: `mobile/lib/features/chat/screens/chat_screen.dart`

**Interfaces:**
- Consumes: `ChatProvider` (Task 5, via `context.watch<ChatProvider>()`), `ChatInput` (Task 10), `ChatMessageBubble` (Task 9), `ChatTypingIndicator` (Task 6), `AppColors`.
- Produces: `class ChatScreen extends StatefulWidget` (no required constructor params).

- [ ] **Step 1: Write the screen**

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../providers/chat_provider.dart';
import '../widgets/chat_input.dart';
import '../widgets/chat_message_bubble.dart';
import '../widgets/chat_typing_indicator.dart';

const _suggestedPrompts = [
  'Find me a good seafood restaurant in Colombo',
  'Recommend a restaurant for a date night',
  'What Sri Lankan restaurants are open tonight?',
  'Book a table for 2 at 7pm tomorrow',
];

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _scrollController = ScrollController();

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final chat = context.watch<ChatProvider>();
    _scrollToBottom();

    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Dining Assistant'),
        actions: [
          if (chat.messages.isNotEmpty)
            IconButton(
              tooltip: 'New conversation',
              icon: const Icon(Icons.refresh),
              onPressed: chat.clearConversation,
            ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: chat.messages.isEmpty
                ? _EmptyState(onPromptSelected: chat.sendMessage)
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    itemCount: chat.messages.length + (chat.loading ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (index == chat.messages.length) {
                        return const Padding(
                          padding: EdgeInsets.only(bottom: 12),
                          child: ChatTypingIndicator(),
                        );
                      }
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: ChatMessageBubble(message: chat.messages[index]),
                      );
                    },
                  ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: ChatInput(
                disabled: chat.loading,
                onSend: chat.sendMessage,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final ValueChanged<String> onPromptSelected;

  const _EmptyState({required this.onPromptSelected});

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
              child: const Icon(Icons.restaurant_menu, color: AppColors.mutedForeground, size: 28),
            ),
            const SizedBox(height: 16),
            const Text(
              'What can I help you with?',
              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
            ),
            const SizedBox(height: 4),
            const Text(
              'Discover restaurants, get personalised recommendations, or book a table.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.mutedForeground, fontSize: 13),
            ),
            const SizedBox(height: 20),
            ..._suggestedPrompts.map((prompt) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: () => onPromptSelected(prompt),
                      style: OutlinedButton.styleFrom(alignment: Alignment.centerLeft),
                      child: Text(prompt, textAlign: TextAlign.left),
                    ),
                  ),
                )),
          ],
        ),
      ),
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
git add lib/features/chat/screens/chat_screen.dart
git commit -m "feat(mobile): add ChatScreen"
```

---

### Task 12: Wire ChatProvider and route into the app

**Files:**
- Modify: `mobile/lib/main.dart`
- Modify: `mobile/lib/core/router/app_router.dart`

**Interfaces:**
- Consumes: `ApiChatRepository` (Task 4), `ChatProvider` (Task 5), `ChatScreen` (Task 11).
- Produces: `/chat` route renders `ChatScreen`; `ChatProvider` available app-wide via `context.watch<ChatProvider>()`/`context.read<ChatProvider>()`.

- [ ] **Step 1: Register the repository and provider in `main.dart`**

Add these imports near the other `features/` imports:

```dart
import 'features/chat/data/chat_repository.dart';
import 'features/chat/providers/chat_provider.dart';
```

In `RestaurantChatbotApp.build`, after the line `final restaurantRepository = ApiRestaurantRepository(apiClient);`, add:

```dart
    final chatRepository = ApiChatRepository(apiClient);
```

In the `MultiProvider`'s `providers` list, after the `ChangeNotifierProvider<RestaurantProvider>` entry, add:

```dart
        ChangeNotifierProvider<ChatProvider>(
          create: (_) => ChatProvider(chatRepository),
        ),
```

- [ ] **Step 2: Replace the `/chat` placeholder route in `app_router.dart`**

Add the import:

```dart
import '../../features/chat/screens/chat_screen.dart';
```

Replace:

```dart
          GoRoute(
            path: '/chat',
            builder: (context, state) => const ComingSoonScreen(title: 'Chat'),
          ),
```

with:

```dart
          GoRoute(
            path: '/chat',
            builder: (context, state) => const ChatScreen(),
          ),
```

(Leave the `ComingSoonScreen` import in place — it's still used by `/reservations` and `/more`.)

- [ ] **Step 3: Verify**

Run: `cd mobile && flutter analyze`
Expected: no new issues.

- [ ] **Step 4: Commit**

```bash
cd mobile
git add lib/main.dart lib/core/router/app_router.dart
git commit -m "feat(mobile): wire ChatProvider and replace Chat tab placeholder with ChatScreen"
```

---

### Task 13: Manual end-to-end verification

No new files — this task exercises the feature on a real device against the real backend, replacing an automated test pass (see Global Constraints).

**Prerequisites:** an Android device/emulator reachable from this machine, and the backend + AI service running and reachable from that device (during the Google Sign-In work earlier in this session, `flutter run -d <device> --dart-define=API_BASE_URL=http://<host-lan-ip>:3000/api` was used successfully — reuse the same device/host IP if still valid, otherwise get a fresh one with `flutter devices` and `ipconfig getifaddr en0`).

- [ ] **Step 1: Run the app**

```bash
cd mobile
flutter run -d <device-id> --dart-define=API_BASE_URL=http://<host-lan-ip>:3000/api
```

Log in, navigate to the Chat tab.

- [ ] **Step 2: Verify the empty state**

Confirm: icon + "What can I help you with?" copy + 4 suggested-prompt buttons render. Tap one (e.g. "Find me a good seafood restaurant in Colombo").

- [ ] **Step 3: Verify a plain-text response**

Confirm: user message appears right-aligned; typing indicator (3 bouncing dots) shows briefly; assistant response renders with Markdown formatting (bold/lists render, not raw `**`/`-` characters).

- [ ] **Step 4: Verify restaurant card rendering**

If the AI service's search intent fires (as it should for a restaurant-search prompt), confirm restaurant cards render (name, rating if present, area, price label, cuisine chips, description) instead of a text bubble, and that tapping a card navigates to that restaurant's detail screen (`/restaurants/:id`) and back-navigation returns to the chat with its state intact.

- [ ] **Step 5: Verify tab-switch persistence**

Switch to the Home tab, then back to Chat. Confirm the conversation is still there (not reset) — per the confirmed design decision.

- [ ] **Step 6: Verify "New conversation" reset**

Tap the refresh/new-conversation icon in the app bar. Confirm messages clear and the empty state with suggested prompts reappears.

- [ ] **Step 7: Verify error fallback**

Stop the backend (or disconnect the device from the network briefly), send a message, confirm the fallback assistant message "Sorry, something went wrong. Please try again." appears instead of a crash or raw exception text. Restart the backend/reconnect afterward.

- [ ] **Step 8: Report results**

No commit for this task — report back which of steps 2–7 passed, and any visual or behavioral discrepancies found, so they can be fixed before considering the feature done.
