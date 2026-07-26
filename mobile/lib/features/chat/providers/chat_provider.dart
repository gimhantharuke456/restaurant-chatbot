import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';
import '../data/chat_repository.dart';
import '../models/chat_message_model.dart';

const _restaurantListSentinel = '__RESTAURANT_LIST__';
const _menuListSentinel = '__MENU_LIST__';

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
        menuData: result.menuData,
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
      } else if (result.message == _menuListSentinel &&
          result.menuData != null &&
          result.menuData!.isNotEmpty) {
        final names = result.menuData!.map((i) => i.name).join(', ');
        historyContent = "Here's ${result.menuData!.first.restaurantName}'s menu: $names";
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
