# Mobile Chat Clone — Design

## Goal

Clone the web frontend's AI chat assistant into the Flutter mobile app, replacing the
`ComingSoonScreen` placeholder currently wired to the bottom-nav "Chat" tab.

## Background: the web implementation

- `ChatWidget.tsx` is the only chat UI actually used in production — it's a floating
  widget mounted in the customer layout. The dedicated `/chat` page (`ChatWindow.tsx`)
  is dead code; `app/(customer)/chat/page.tsx` just redirects to `/home`.
- `useChat.ts` owns state: `messages: Message[]`, `loading: boolean`, a `sessionId`
  (client-generated UUID, one per widget mount), and a `historyRef` array of
  `{role, content}` sent back to the server on every request.
- `POST /api/chat/message` (proxied to the backend, which proxies to the AI service),
  body `{message, sessionId, history}`, bearer-authed. Response: `{message, data?}`
  (also `intent`, `guest_limit_reached` — unused by the UI).
- Special-case #1: if `message === "__RESTAURANT_LIST__"` and `data` is a non-empty
  array, render restaurant cards instead of a text bubble. `data` items match:
  `{id, name, description?, address, area, cuisineTypes, priceRange, avgRating?, imageUrls}`
  where `cuisineTypes`/`imageUrls` are **JSON-encoded strings** (raw DB columns via a
  direct SQL query in the AI service — NOT the same shape as `GET /restaurants`, which
  already parses these into arrays). The web parses `cuisineTypes` client-side with a
  try/catch fallback to `[cuisineTypes]`.
- Special-case #2: assistant text containing `Payment link: <url>` (or any
  `https://checkout.stripe.com/...` URL) gets that URL stripped from the displayed
  text and replaced with a "Pay Now" button opening the URL in a new tab.
- Assistant text otherwise renders as Markdown (paragraphs, bold/italic, lists,
  h1–h3, hr, links, inline code). User text renders as plain pre-wrapped text.
- Empty state: centered icon + "What can I help you with?" + 4 suggested-prompt
  buttons that call `sendMessage` directly.
- Typing indicator: 3 bouncing dots while `loading`.
- Errors (network failure, AI service down → 502) are swallowed into a fallback
  assistant message: "Sorry, something went wrong. Please try again." No error banner.
- History summarization: when storing the `__RESTAURANT_LIST__` turn into
  `historyRef`, it's replaced with `"Here are the restaurants I found: <names>"` so
  the model has a meaningful memory of what was shown.
- Not used by the UI at all (skip in the clone): `GET /chat/history`,
  `DELETE /chat/session/:id`, and the guest (`POST /chat/guest`, 3-message limit)
  flow — mobile already forces login before any tab is reachable.

## Scope decision (confirmed with user)

Chat state persists across bottom-nav tab switches, resetting only on app restart —
matching the web widget's behavior of surviving until a page reload. This means
`ChatProvider` is created once at the `MultiProvider` level in `main.dart` (same
pattern as `AuthProvider`/`RestaurantProvider`), not scoped to the screen.

## Architecture

New `lib/features/chat/` module, following the existing repository → provider →
screen/widgets layering used by `auth` and `restaurants`:

```
lib/features/chat/
  models/
    chat_message_model.dart       # role, content, data (List<ChatRestaurantResult>?), timestamp
    chat_restaurant_result.dart    # id, name, description?, address, area,
                                    # cuisineTypes (String), priceRange, avgRating?, imageUrls (String)
  data/
    chat_repository.dart           # abstract ChatRepository + ApiChatRepository
  providers/
    chat_provider.dart              # ChangeNotifier: messages, loading, sessionId, history
  screens/
    chat_screen.dart
  widgets/
    chat_message_bubble.dart
    chat_restaurant_card.dart
    chat_payment_button.dart
    chat_input.dart
    chat_typing_indicator.dart
```

`ChatRepository.sendMessage(message, sessionId, history)` → `POST /chat/message` via
the existing `ApiClient` (bearer token auto-attached). `ChatProvider` mirrors
`useChat.ts`: appends the user message, calls the repository, appends the assistant
response (or the fallback error message on any exception), and maintains the
`history` list with the same restaurant-list summarization rule.

`sessionId`: generate one UUID (via the `uuid` package) when `ChatProvider` is
constructed — one per app run, matching one-per-widget-mount on web.

## UI

- `ChatScreen`: `AppBar` with title "AI Dining Assistant", a small green "online"
  dot + label, and a reset (new conversation) action that clears `ChatProvider`'s
  state — borrowed from the web widget's header since a bare full-screen chat with
  no way to start over would feel unfinished. Body: message list (auto-scrolls to
  bottom on new message/loading change) + bottom input bar.
- Empty state: centered icon (`Icons.restaurant_menu`), "What can I help you with?"
  copy, and the 4 suggested prompts from the web's full-page `ChatWindow` variant
  (they read better full-width than the widget's shorter list):
  - "Find me a good seafood restaurant in Colombo"
  - "Recommend a restaurant for a date night"
  - "What Sri Lankan restaurants are open tonight?"
  - "Book a table for 2 at 7pm tomorrow"
- `ChatMessageBubble`: user → right-aligned plain text bubble (primary color).
  Assistant → Markdown via `flutter_markdown_plus` (the official `flutter_markdown`
  package is discontinued; this fork covers the same subset the web renders:
  paragraphs, bold/italic, lists, headings, links, inline code).
- Restaurant results: `ChatRestaurantCard` list (name, rating, area, price tier,
  cuisine chips, description) instead of a bubble when
  `content == "__RESTAURANT_LIST__"` and `data` is non-empty. Tapping a card
  navigates to the existing `/restaurants/:id` route via `context.go`.
- Payment link: same marker/regex extraction as web. Strips the URL from displayed
  text, shows `ChatPaymentButton` ("Pay Now") that opens the Stripe checkout URL via
  `url_launcher` (external browser — equivalent of the web's `target="_blank"`).
- `ChatTypingIndicator`: 3 bouncing dots while `loading`.
- Errors: caught in `ChatProvider.sendMessage`, appends the same fallback assistant
  message as web. No error state surfaced to the UI beyond that message.

## New dependencies

- `uuid` — session id generation
- `flutter_markdown_plus` — assistant message rendering
- `url_launcher` — opening the Stripe payment link

## Out of scope

- Guest chat / message limit (mobile always requires auth)
- `GET /chat/history`, `DELETE /chat/session/:id` (unused by the web UI itself)
- Any UI the web itself doesn't have (e.g. rich menu-item cards, voice input)
