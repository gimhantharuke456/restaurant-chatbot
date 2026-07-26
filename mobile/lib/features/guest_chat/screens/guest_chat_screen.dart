import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/motion/entrance.dart';
import '../../../core/theme/app_colors.dart';
import '../../chat/widgets/chat_typing_indicator.dart';
import '../providers/guest_chat_provider.dart';

const _suggestions = [
  'Find a seafood restaurant',
  'Recommend for a date night',
  'Best budget dining',
];

class GuestChatScreen extends StatefulWidget {
  const GuestChatScreen({super.key});

  @override
  State<GuestChatScreen> createState() => _GuestChatScreenState();
}

class _GuestChatScreenState extends State<GuestChatScreen> {
  final _inputController = TextEditingController();
  final _scrollController = ScrollController();

  @override
  void dispose() {
    _inputController.dispose();
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

  void _send(String text) {
    if (text.trim().isEmpty) return;
    _inputController.clear();
    context.read<GuestChatProvider>().sendMessage(text.trim());
    _scrollToBottom();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<GuestChatProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Dining Assistant'),
        actions: [
          TextButton(
            onPressed: () => context.go('/login'),
            child: const Text('Sign In'),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: provider.messages.isEmpty
                ? _GuestChatIntro(onSuggestionTap: _send)
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    itemCount: provider.messages.length + (provider.loading ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (index == provider.messages.length) {
                        return const Padding(
                          padding: EdgeInsets.only(bottom: 8),
                          child: ChatTypingIndicator(),
                        );
                      }
                      final message = provider.messages[index];
                      return staggeredEntrance(_GuestChatBubble(message: message), index: index);
                    },
                  ),
          ),
          if (provider.limitReached)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              color: AppColors.primary.withValues(alpha: 0.1),
              child: Column(
                children: [
                  const Text(
                    "You've reached the free message limit.",
                    style: TextStyle(fontWeight: FontWeight.w600),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => context.go('/login'),
                      child: const Text('Sign in to keep chatting'),
                    ),
                  ),
                ],
              ),
            )
          else
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _inputController,
                        enabled: !provider.loading,
                        decoration: const InputDecoration(hintText: 'Ask about restaurants…'),
                        onSubmitted: _send,
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton.filled(
                      onPressed: provider.loading ? null : () => _send(_inputController.text),
                      icon: const Icon(Icons.send),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _GuestChatIntro extends StatelessWidget {
  final ValueChanged<String> onSuggestionTap;

  const _GuestChatIntro({required this.onSuggestionTap});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Hi! I can help you discover restaurants. What are you craving?',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.mutedForeground),
            ),
            const SizedBox(height: 16),
            ..._suggestions.map((s) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: () => onSuggestionTap(s),
                      child: Text(s, textAlign: TextAlign.left),
                    ),
                  ),
                )),
          ],
        ),
      ),
    );
  }
}

class _GuestChatBubble extends StatelessWidget {
  final GuestChatMessage message;

  const _GuestChatBubble({required this.message});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        mainAxisAlignment: message.isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        children: [
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: message.isUser ? AppColors.primary : AppColors.muted,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Text(
                message.content,
                style: TextStyle(color: message.isUser ? Colors.white : AppColors.foreground),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
