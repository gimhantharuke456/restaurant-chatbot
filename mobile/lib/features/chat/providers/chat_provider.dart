import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';
import '../../../core/location/location_helper.dart';
import '../../chat_history/models/chat_session_model.dart';
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
      final location = await resolveLocation();
      final result = await _repository.sendMessage(
        message: content,
        sessionId: sessionId,
        history: List.of(_history),
        lat: location?.lat,
        lng: location?.lng,
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

  // Persisted history only ever stores {role, content} — a resumed card-list
  // turn has no data to re-render, so fall back to a plain description
  // rather than showing the raw sentinel string.
  String _displayContentForResume(String content) {
    if (content == _restaurantListSentinel) return '(Showed restaurant recommendations)';
    if (content == _menuListSentinel) return "(Showed a restaurant's menu)";
    return content;
  }

  void resumeSession(ChatSessionModel session) {
    sessionId = session.id;
    _history
      ..clear()
      ..addAll(session.messages.map((m) => ChatHistoryEntry(role: m.role, content: m.content)));
    messages = session.messages
        .map((m) => ChatMessageModel(
              id: _uuid.v4(),
              role: m.role == 'user' ? ChatRole.user : ChatRole.assistant,
              content: _displayContentForResume(m.content),
              timestamp: DateTime.now(),
            ))
        .toList();
    notifyListeners();
  }
}
