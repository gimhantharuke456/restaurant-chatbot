import '../../../core/network/api_client.dart';
import '../models/chat_session_model.dart';

abstract class ChatHistoryRepository {
  Future<List<ChatSessionModel>> getSessions();
  Future<void> deleteSession(String id);
}

class ApiChatHistoryRepository implements ChatHistoryRepository {
  final ApiClient _apiClient;

  ApiChatHistoryRepository(this._apiClient);

  @override
  Future<List<ChatSessionModel>> getSessions() async {
    final json = await _apiClient.get('/chat/history');
    if (json is! List) return [];
    return json.whereType<Map<String, dynamic>>().map(ChatSessionModel.fromJson).toList();
  }

  @override
  Future<void> deleteSession(String id) async {
    await _apiClient.delete('/chat/session/$id');
  }
}
