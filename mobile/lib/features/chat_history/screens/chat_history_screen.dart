import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/motion/entrance.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/empty_state_view.dart';
import '../../../shared/widgets/error_retry_view.dart';
import '../../../shared/widgets/loading_view.dart';
import '../../chat/providers/chat_provider.dart';
import '../models/chat_session_model.dart';
import '../providers/chat_history_provider.dart';

class ChatHistoryScreen extends StatefulWidget {
  const ChatHistoryScreen({super.key});

  @override
  State<ChatHistoryScreen> createState() => _ChatHistoryScreenState();
}

class _ChatHistoryScreenState extends State<ChatHistoryScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ChatHistoryProvider>().fetch();
    });
  }

  String _relativeTime(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${dt.day}/${dt.month}/${dt.year}';
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ChatHistoryProvider>();

    return Scaffold(
      appBar: AppBar(title: const Text('Chat History')),
      body: Builder(builder: (context) {
        if (provider.isLoading && provider.sessions.isEmpty) {
          return const LoadingView();
        }
        if (provider.error != null && provider.sessions.isEmpty) {
          return ErrorRetryView(message: provider.error!, onRetry: provider.fetch);
        }
        if (provider.sessions.isEmpty) {
          return const EmptyStateView(
            icon: Icons.forum_outlined,
            title: 'No past conversations yet',
            subtitle: 'Chats you start with the AI assistant will show up here.',
          );
        }

        return RefreshIndicator(
          onRefresh: provider.fetch,
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: provider.sessions.length,
            itemBuilder: (context, index) {
              final session = provider.sessions[index];
              return staggeredEntrance(
                _SessionCard(
                  session: session,
                  onTap: () {
                    context.read<ChatProvider>().resumeSession(session);
                    context.pop();
                  },
                  onDelete: () => context.read<ChatHistoryProvider>().delete(session.id),
                  relativeTime: _relativeTime(session.updatedAt),
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

class _SessionCard extends StatelessWidget {
  final ChatSessionModel session;
  final VoidCallback onTap;
  final VoidCallback onDelete;
  final String relativeTime;

  const _SessionCard({
    required this.session,
    required this.onTap,
    required this.onDelete,
    required this.relativeTime,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      color: AppColors.card,
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      session.title ?? 'New conversation',
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(relativeTime, style: const TextStyle(color: AppColors.mutedForeground, fontSize: 12)),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.delete_outline, size: 20, color: AppColors.mutedForeground),
                onPressed: onDelete,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
