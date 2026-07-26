import '../../../core/network/api_client.dart';
import '../../chat/data/chat_repository.dart';

class GuestChatResult {
  final String message;
  final bool limitReached;

  const GuestChatResult({required this.message, required this.limitReached});
}

abstract class GuestChatRepository {
  Future<GuestChatResult> sendMessage({
    required String message,
    required String sessionId,
    required List<ChatHistoryEntry> history,
  });
}

class ApiGuestChatRepository implements GuestChatRepository {
  final ApiClient _apiClient;

  ApiGuestChatRepository(this._apiClient);

  @override
  Future<GuestChatResult> sendMessage({
    required String message,
    required String sessionId,
    required List<ChatHistoryEntry> history,
  }) async {
    final json = await _apiClient.post('/chat/guest', body: {
      'message': message,
      'sessionId': sessionId,
      'history': history.map((h) => h.toJson()).toList(),
    }) as Map<String, dynamic>;

    return GuestChatResult(
      message: json['message'] as String,
      limitReached: json['guest_limit_reached'] as bool? ?? false,
    );
  }
}
