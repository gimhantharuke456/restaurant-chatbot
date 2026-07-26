import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/motion/entrance.dart';
import '../../../shared/widgets/empty_state_view.dart';
import '../../../shared/widgets/error_retry_view.dart';
import '../../../shared/widgets/loading_view.dart';
import '../providers/notifications_provider.dart';
import '../widgets/notification_tile.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<NotificationsProvider>().fetch();
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<NotificationsProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          if (provider.unreadCount > 0)
            TextButton(
              onPressed: () => context.read<NotificationsProvider>().markAllRead(),
              child: const Text('Mark all read'),
            ),
        ],
      ),
      body: Builder(builder: (context) {
        if (provider.isLoading && provider.notifications.isEmpty) {
          return const LoadingView();
        }
        if (provider.error != null && provider.notifications.isEmpty) {
          return ErrorRetryView(message: provider.error!, onRetry: provider.fetch);
        }
        if (provider.notifications.isEmpty) {
          return const EmptyStateView(
            icon: Icons.notifications_none,
            title: 'No notifications yet',
            subtitle: "We'll let you know when something needs your attention.",
          );
        }

        return RefreshIndicator(
          onRefresh: provider.fetch,
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: provider.notifications.length,
            itemBuilder: (context, index) {
              final notification = provider.notifications[index];
              return staggeredEntrance(
                NotificationTile(
                  notification: notification,
                  onTap: () => context.read<NotificationsProvider>().markRead(notification.id),
                ),
                index: index,
              );
            },
          ),
        );
      }),
    );
  }
}
