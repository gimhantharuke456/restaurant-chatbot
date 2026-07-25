import 'package:flutter/material.dart';
import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/theme/app_colors.dart';
import '../models/chat_message_model.dart';
import 'chat_payment_button.dart';
import 'chat_restaurant_card.dart';

const _restaurantListSentinel = '__RESTAURANT_LIST__';

class ChatMessageBubble extends StatelessWidget {
  final ChatMessageModel message;

  const ChatMessageBubble({super.key, required this.message});

  @override
  Widget build(BuildContext context) {
    final isRestaurantList = message.content == _restaurantListSentinel &&
        message.data != null &&
        message.data!.isNotEmpty;

    if (isRestaurantList) {
      return Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const CircleAvatar(
            radius: 14,
            backgroundColor: AppColors.muted,
            child: Text(
              'AI',
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.mutedForeground),
            ),
          ),
          const SizedBox(width: 8),
          Flexible(
            child: Container(
              constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.muted,
                borderRadius: BorderRadius.circular(16),
              ),
              child: ChatRestaurantList(items: message.data!),
            ),
          ),
        ],
      );
    }

    return Row(
      mainAxisAlignment: message.isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        if (!message.isUser) ...[
          const CircleAvatar(
            radius: 14,
            backgroundColor: AppColors.muted,
            child: Text(
              'AI',
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.mutedForeground),
            ),
          ),
          const SizedBox(width: 8),
        ],
        Flexible(
          child: Container(
            constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: message.isUser ? AppColors.primary : AppColors.muted,
              borderRadius: BorderRadius.only(
                topLeft: const Radius.circular(16),
                topRight: const Radius.circular(16),
                bottomLeft: Radius.circular(message.isUser ? 16 : 4),
                bottomRight: Radius.circular(message.isUser ? 4 : 16),
              ),
            ),
            child: message.isUser
                ? Text(message.content, style: const TextStyle(color: AppColors.foreground, fontSize: 14))
                : _AssistantMessageText(content: message.content),
          ),
        ),
        if (message.isUser) const SizedBox(width: 8),
        if (message.isUser)
          const CircleAvatar(
            radius: 14,
            backgroundColor: AppColors.primary,
            child: Text(
              'U',
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.foreground),
            ),
          ),
      ],
    );
  }
}

class _AssistantMessageText extends StatelessWidget {
  final String content;

  const _AssistantMessageText({required this.content});

  @override
  Widget build(BuildContext context) {
    final extracted = extractPayment(content);
    final styleSheet = MarkdownStyleSheet.fromTheme(Theme.of(context)).copyWith(
      p: const TextStyle(color: AppColors.foreground, fontSize: 14, height: 1.4),
      strong: const TextStyle(
        color: AppColors.foreground, fontSize: 14, fontWeight: FontWeight.bold, height: 1.4),
      em: const TextStyle(
        color: AppColors.foreground, fontSize: 14, fontStyle: FontStyle.italic, height: 1.4),
      listBullet: const TextStyle(color: AppColors.foreground, fontSize: 14),
      h1: const TextStyle(color: AppColors.foreground, fontSize: 16, fontWeight: FontWeight.bold),
      h2: const TextStyle(color: AppColors.foreground, fontSize: 15, fontWeight: FontWeight.bold),
      h3: const TextStyle(color: AppColors.foreground, fontSize: 14, fontWeight: FontWeight.w600),
      a: const TextStyle(color: AppColors.primary, decoration: TextDecoration.underline),
      code: const TextStyle(
        color: AppColors.foreground,
        backgroundColor: AppColors.background,
        fontSize: 12,
        fontFamily: 'monospace',
      ),
      blockSpacing: 6,
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        MarkdownBody(
          data: extracted.displayText,
          styleSheet: styleSheet,
          onTapLink: (text, href, title) {
            if (href != null) launchUrl(Uri.parse(href), mode: LaunchMode.externalApplication);
          },
        ),
        if (extracted.paymentUrl != null) ChatPaymentButton(url: extracted.paymentUrl!),
      ],
    );
  }
}
