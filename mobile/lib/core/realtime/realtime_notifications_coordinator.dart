import 'dart:async';
import '../../features/notifications/models/notification_model.dart';
import '../../features/notifications/providers/notifications_provider.dart';
import '../local_notifications/local_notifications_service.dart';
import 'socket_service.dart';

/// Bridges Firebase's ID-token stream to the socket connection and, from
/// there, incoming `notification:new` events to [NotificationsProvider] and
/// the OS notification tray. Reconnects the socket on every token refresh so
/// its auth handshake never runs on a stale token.
class RealtimeNotificationsCoordinator {
  final SocketService _socketService;
  final LocalNotificationsService _localNotifications;
  final NotificationsProvider _notificationsProvider;
  StreamSubscription<String?>? _tokenSubscription;

  RealtimeNotificationsCoordinator({
    required SocketService socketService,
    required LocalNotificationsService localNotifications,
    required NotificationsProvider notificationsProvider,
    required Stream<String?> tokenChanges,
  })  : _socketService = socketService,
        _localNotifications = localNotifications,
        _notificationsProvider = notificationsProvider {
    _tokenSubscription = tokenChanges.listen(_onTokenChanged);
  }

  void _onTokenChanged(String? token) {
    if (token == null) {
      _socketService.disconnect();
      return;
    }
    _socketService.connect(token);
    _socketService.on('notification:new', _handleIncoming);
  }

  void _handleIncoming(dynamic data) {
    if (data is! Map) return;
    try {
      final notification = NotificationModel.fromJson(Map<String, dynamic>.from(data));
      _notificationsProvider.receiveLive(notification);
      _localNotifications.show(title: notification.title, body: notification.message);
    } catch (_) {
      // Malformed payload — ignore rather than crash the socket listener.
    }
  }

  void dispose() {
    _tokenSubscription?.cancel();
    _socketService.disconnect();
  }
}
