import '../../../core/network/api_client.dart';
import '../models/chat_menu_item_result.dart';
import '../models/chat_restaurant_result.dart';

const restaurantListSentinel = '__RESTAURANT_LIST__';
const menuListSentinel = '__MENU_LIST__';

class ChatHistoryEntry {
  final String role;
  final String content;

  const ChatHistoryEntry({required this.role, required this.content});

  Map<String, dynamic> toJson() => {'role': role, 'content': content};
}

class ChatSendResult {
  final String message;
  final List<ChatRestaurantResult>? data;
  final List<ChatMenuItemResult>? menuData;

  const ChatSendResult({required this.message, this.data, this.menuData});
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

    final responseMessage = json['message'] as String;
    final rawData = json['data'];

    List<ChatRestaurantResult>? parsedData;
    List<ChatMenuItemResult>? parsedMenuData;
    if (rawData is List) {
      final maps = rawData.whereType<Map<String, dynamic>>();
      if (responseMessage == menuListSentinel) {
        parsedMenuData = maps.map(ChatMenuItemResult.fromJson).toList();
      } else {
        parsedData = maps.map(ChatRestaurantResult.fromJson).toList();
      }
    }

    return ChatSendResult(message: responseMessage, data: parsedData, menuData: parsedMenuData);
  }
}
