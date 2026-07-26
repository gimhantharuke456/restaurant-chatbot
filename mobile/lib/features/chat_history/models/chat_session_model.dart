class ChatSessionMessage {
  final String role;
  final String content;

  const ChatSessionMessage({required this.role, required this.content});

  factory ChatSessionMessage.fromJson(Map<String, dynamic> json) {
    return ChatSessionMessage(
      role: json['role'] as String,
      content: json['content'] as String,
    );
  }
}

class ChatSessionModel {
  final String id;
  final String? title;
  final List<ChatSessionMessage> messages;
  final DateTime updatedAt;

  const ChatSessionModel({
    required this.id,
    required this.messages,
    required this.updatedAt,
    this.title,
  });

  factory ChatSessionModel.fromJson(Map<String, dynamic> json) {
    return ChatSessionModel(
      id: json['id'] as String,
      title: json['title'] as String?,
      messages: (json['messages'] as List? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(ChatSessionMessage.fromJson)
          .toList(),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }
}
