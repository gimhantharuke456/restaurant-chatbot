import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/motion/entrance.dart';
import '../../../shared/widgets/empty_state_view.dart';
import '../../../shared/widgets/error_retry_view.dart';
import '../../../shared/widgets/loading_view.dart';
import '../providers/waitlist_provider.dart';
import '../widgets/waitlist_card.dart';

class WaitlistScreen extends StatefulWidget {
  const WaitlistScreen({super.key});

  @override
  State<WaitlistScreen> createState() => _WaitlistScreenState();
}

class _WaitlistScreenState extends State<WaitlistScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<WaitlistProvider>().fetch();
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<WaitlistProvider>();

    return Scaffold(
      appBar: AppBar(title: const Text('My Waitlists')),
      body: Builder(builder: (context) {
        if (provider.isLoading && provider.entries.isEmpty) {
          return const LoadingView();
        }
        if (provider.error != null && provider.entries.isEmpty) {
          return ErrorRetryView(message: provider.error!, onRetry: provider.fetch);
        }
        if (provider.entries.isEmpty) {
          return const EmptyStateView(
            icon: Icons.watch_later_outlined,
            title: 'No active waitlists',
            subtitle: 'When a restaurant is fully booked, you can join the waitlist from its page.',
          );
        }

        return RefreshIndicator(
          onRefresh: provider.fetch,
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: provider.entries.length,
            itemBuilder: (context, index) {
              final entry = provider.entries[index];
              return staggeredEntrance(
                WaitlistCard(
                  entry: entry,
                  onLeave: () => context.read<WaitlistProvider>().leave(entry.id),
                  onBookNow: entry.status == 'NOTIFIED' ? () => context.go('/chat') : null,
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
