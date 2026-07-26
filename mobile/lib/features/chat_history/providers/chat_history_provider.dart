import 'package:flutter/foundation.dart';
import '../data/chat_history_repository.dart';
import '../models/chat_session_model.dart';

class ChatHistoryProvider extends ChangeNotifier {
  final ChatHistoryRepository _repository;

  ChatHistoryProvider(this._repository);

  List<ChatSessionModel> sessions = [];
  bool isLoading = false;
  String? error;

  Future<void> fetch() async {
    isLoading = true;
    error = null;
    notifyListeners();
    try {
      sessions = await _repository.getSessions();
    } catch (e) {
      error = e.toString();
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<void> delete(String id) async {
    final previous = sessions;
    sessions = sessions.where((s) => s.id != id).toList();
    notifyListeners();
    try {
      await _repository.deleteSession(id);
    } catch (e) {
      sessions = previous;
      error = e.toString();
      notifyListeners();
    }
  }
}
