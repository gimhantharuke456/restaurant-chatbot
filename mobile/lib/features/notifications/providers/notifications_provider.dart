import 'package:flutter/foundation.dart';
import '../data/notifications_repository.dart';
import '../models/notification_model.dart';

class NotificationsProvider extends ChangeNotifier {
  final NotificationsRepository _repository;

  NotificationsProvider(this._repository);

  List<NotificationModel> notifications = [];
  int unreadCount = 0;
  bool isLoading = false;
  String? error;

  Future<void> fetch() async {
    isLoading = true;
    error = null;
    notifyListeners();
    try {
      final page = await _repository.getNotifications();
      notifications = page.data;
      unreadCount = page.unreadCount;
    } catch (e) {
      error = e.toString();
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  /// Inserts a notification pushed live over the socket connection, without
  /// a network round-trip — used by [RealtimeNotificationsCoordinator].
  void receiveLive(NotificationModel notification) {
    if (notifications.any((n) => n.id == notification.id)) return;
    notifications = [notification, ...notifications];
    if (!notification.isRead) unreadCount++;
    notifyListeners();
  }

  Future<void> markRead(String id) async {
    final index = notifications.indexWhere((n) => n.id == id);
    if (index == -1 || notifications[index].isRead) return;
    notifications[index] = notifications[index].copyWith(isRead: true);
    unreadCount = unreadCount > 0 ? unreadCount - 1 : 0;
    notifyListeners();
    try {
      await _repository.markRead(id);
    } catch (_) {
      // Best-effort: local state already reflects the tap; a background refresh will resync.
    }
  }

  Future<void> markAllRead() async {
    if (unreadCount == 0) return;
    notifications = notifications.map((n) => n.copyWith(isRead: true)).toList();
    unreadCount = 0;
    notifyListeners();
    try {
      await _repository.markAllRead();
    } catch (_) {}
  }
}
