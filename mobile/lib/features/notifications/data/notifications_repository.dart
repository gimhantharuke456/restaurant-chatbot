import '../../../core/network/api_client.dart';
import '../models/notification_model.dart';

class NotificationsPage {
  final List<NotificationModel> data;
  final int unreadCount;

  const NotificationsPage({required this.data, required this.unreadCount});
}

abstract class NotificationsRepository {
  Future<NotificationsPage> getNotifications();
  Future<void> markRead(String id);
  Future<void> markAllRead();
}

class ApiNotificationsRepository implements NotificationsRepository {
  final ApiClient _apiClient;

  ApiNotificationsRepository(this._apiClient);

  @override
  Future<NotificationsPage> getNotifications() async {
    final json = await _apiClient.get('/users/me/notifications', query: {'limit': '50'})
        as Map<String, dynamic>;
    final data = (json['data'] as List? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(NotificationModel.fromJson)
        .toList();
    return NotificationsPage(data: data, unreadCount: json['unreadCount'] as int? ?? 0);
  }

  @override
  Future<void> markRead(String id) async {
    await _apiClient.patch('/users/me/notifications/$id/read');
  }

  @override
  Future<void> markAllRead() async {
    await _apiClient.patch('/users/me/notifications/read-all');
  }
}
