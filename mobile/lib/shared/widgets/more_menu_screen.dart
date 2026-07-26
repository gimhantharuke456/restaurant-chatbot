import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../features/notifications/providers/notifications_provider.dart';

/// A simple hub for secondary features that don't warrant their own
/// bottom-nav tab. Add new entries here as they're built (profile, etc.).
class MoreMenuScreen extends StatefulWidget {
  const MoreMenuScreen({super.key});

  @override
  State<MoreMenuScreen> createState() => _MoreMenuScreenState();
}

class _MoreMenuScreenState extends State<MoreMenuScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<NotificationsProvider>().fetch();
    });
  }

  @override
  Widget build(BuildContext context) {
    final unreadCount = context.watch<NotificationsProvider>().unreadCount;

    return Scaffold(
      appBar: AppBar(title: const Text('More')),
      body: ListView(
        children: [
          ListTile(
            leading: const Icon(Icons.notifications_none),
            title: const Text('Notifications'),
            trailing: unreadCount > 0
                ? Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.primary,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '$unreadCount',
                      style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  )
                : const Icon(Icons.chevron_right),
            onTap: () => context.push('/notifications'),
          ),
          ListTile(
            leading: const Icon(Icons.favorite_border),
            title: const Text('Saved Restaurants'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/favorites'),
          ),
          ListTile(
            leading: const Icon(Icons.emoji_events_outlined),
            title: const Text('Loyalty Rewards'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/loyalty'),
          ),
          ListTile(
            leading: const Icon(Icons.report_problem_outlined),
            title: const Text('My Complaints'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/complaints'),
          ),
          ListTile(
            leading: const Icon(Icons.watch_later_outlined),
            title: const Text('My Waitlists'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/waitlist'),
          ),
        ],
      ),
    );
  }
}
