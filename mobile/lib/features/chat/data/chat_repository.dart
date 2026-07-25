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
