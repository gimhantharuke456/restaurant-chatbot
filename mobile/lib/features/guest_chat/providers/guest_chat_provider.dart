import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';
import '../../chat/data/chat_repository.dart';
import '../data/guest_chat_repository.dart';

const _restaurantListSentinel = '__RESTAURANT_LIST__';
const _menuListSentinel = '__MENU_LIST__';
const _restaurantListGuestReply =
    'Here are some restaurants I found for you! Sign in to see full details and book a table.';
const _menuListGuestReply = 'Here\'s their menu! Sign in to order and book a table.';

class GuestChatMessage {
  final String id;
  final bool isUser;
  final String content;

  const GuestChatMessage({required this.id, required this.isUser, required this.content});
}

class GuestChatProvider extends ChangeNotifier {
  final GuestChatRepository _repository;
  final _uuid = const Uuid();

  GuestChatProvider(this._repository) : sessionId = const Uuid().v4();

  String sessionId;
  List<GuestChatMessage> messages = [];
  bool loading = false;
  bool limitReached = false;
  final List<ChatHistoryEntry> _history = [];

  Future<void> sendMessage(String content) async {
    if (loading || limitReached) return;

    messages = [...messages, GuestChatMessage(id: _uuid.v4(), isUser: true, content: content)];
    loading = true;
    notifyListeners();

    _history.add(ChatHistoryEntry(role: 'user', content: content));

    try {
      final result = await _repository.sendMessage(
        message: content,
        sessionId: sessionId,
        history: List.of(_history),
      );

      final String reply;
      if (result.message == _restaurantListSentinel) {
        reply = _restaurantListGuestReply;
      } else if (result.message == _menuListSentinel) {
        reply = _menuListGuestReply;
      } else {
        reply = result.message;
      }
      messages = [...messages, GuestChatMessage(id: _uuid.v4(), isUser: false, content: reply)];
      _history.add(ChatHistoryEntry(role: 'assistant', content: reply));
      if (result.limitReached) limitReached = true;
    } catch (_) {
      messages = [
        ...messages,
        GuestChatMessage(
          id: _uuid.v4(),
          isUser: false,
          content: 'Sorry, something went wrong. Please try again.',
        ),
      ];
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  void reset() {
    messages = [];
    _history.clear();
    loading = false;
    limitReached = false;
    sessionId = _uuid.v4();
    notifyListeners();
  }
}
