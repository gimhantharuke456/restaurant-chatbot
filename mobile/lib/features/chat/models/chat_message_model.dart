import 'chat_menu_item_result.dart';
import 'chat_restaurant_result.dart';

enum ChatRole { user, assistant }

class ChatMessageModel {
  final String id;
  final ChatRole role;
  final String content;
  final List<ChatRestaurantResult>? data;
  final List<ChatMenuItemResult>? menuData;
  final DateTime timestamp;

  const ChatMessageModel({
    required this.id,
    required this.role,
    required this.content,
    required this.timestamp,
    this.data,
    this.menuData,
  });

  bool get isUser => role == ChatRole.user;
}
