import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../shared/widgets/empty_state_view.dart';
import '../providers/chat_provider.dart';
import '../widgets/chat_input.dart';
import '../widgets/chat_message_bubble.dart';
import '../widgets/chat_typing_indicator.dart';

const _suggestedPrompts = [
  'Find me a good seafood restaurant in Colombo',
  'Recommend a restaurant for a date night',
  'What Sri Lankan restaurants are open tonight?',
  'Book a table for 2 at 7pm tomorrow',
];

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _scrollController = ScrollController();

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final chat = context.watch<ChatProvider>();
    _scrollToBottom();

    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Dining Assistant'),
        actions: [
          if (chat.messages.isNotEmpty)
            IconButton(
              tooltip: 'New conversation',
              icon: const Icon(Icons.refresh),
              onPressed: chat.clearConversation,
            ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: chat.messages.isEmpty
                ? _EmptyState(onPromptSelected: chat.sendMessage)
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    itemCount: chat.messages.length + (chat.loading ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (index == chat.messages.length) {
                        return const Padding(
                          padding: EdgeInsets.only(bottom: 12),
                          child: ChatTypingIndicator(),
                        );
                      }
                      return Padding(
                        key: ValueKey(chat.messages[index].id),
                        padding: const EdgeInsets.only(bottom: 12),
                        child: ChatMessageBubble(message: chat.messages[index]),
                      );
                    },
                  ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: ChatInput(
                disabled: chat.loading,
                onSend: chat.sendMessage,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final ValueChanged<String> onPromptSelected;

  const _EmptyState({required this.onPromptSelected});

  @override
  Widget build(BuildContext context) {
    return EmptyStateView(
      icon: Icons.restaurant_menu,
      title: 'What can I help you with?',
      subtitle: 'Discover restaurants, get personalised recommendations, or book a table.',
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: _suggestedPrompts
            .map((prompt) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: () => onPromptSelected(prompt),
                      style: OutlinedButton.styleFrom(alignment: Alignment.centerLeft),
                      child: Text(prompt, textAlign: TextAlign.left),
                    ),
                  ),
                ))
            .toList(),
      ),
    );
  }
}
