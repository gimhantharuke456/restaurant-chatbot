import 'package:flutter/material.dart';
import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/motion/entrance.dart';
import '../../../core/theme/app_colors.dart';
import '../models/chat_message_model.dart';
import 'chat_menu_item_card.dart';
import 'chat_payment_button.dart';
import 'chat_restaurant_card.dart';

const _restaurantListSentinel = '__RESTAURANT_LIST__';
const _menuListSentinel = '__MENU_LIST__';

class ChatMessageBubble extends StatelessWidget {
  final ChatMessageModel message;

  const ChatMessageBubble({super.key, required this.message});

  @override
  Widget build(BuildContext context) {
    return staggeredEntrance(_buildContent(context));
  }

  Widget _buildContent(BuildContext context) {
    final mutedBg = Theme.of(context).colorScheme.secondary;
    final mutedFg = Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.55);

    final isRestaurantList = message.content == _restaurantListSentinel &&
        message.data != null &&
        message.data!.isNotEmpty;
    final isMenuList = message.content == _menuListSentinel &&
        message.menuData != null &&
        message.menuData!.isNotEmpty;

    if (isRestaurantList || isMenuList) {
      return Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 14,
            backgroundColor: mutedBg,
            child: Text(
              'AI',
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: mutedFg),
            ),
          ),
          const SizedBox(width: 8),
          Flexible(
            child: Container(
              constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: mutedBg,
                borderRadius: BorderRadius.circular(16),
              ),
              child: isRestaurantList
                  ? ChatRestaurantList(items: message.data!)
                  : ChatMenuItemList(items: message.menuData!),
            ),
          ),
        ],
      );
    }

    if (message.isUser) {
      return Row(
        mainAxisAlignment: MainAxisAlignment.end,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Flexible(
            child: Container(
              constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: const BoxDecoration(
                color: AppColors.primary,
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(16),
                  topRight: Radius.circular(16),
                  bottomLeft: Radius.circular(16),
                  bottomRight: Radius.circular(4),
                ),
              ),
              child: Text(message.content, style: const TextStyle(color: Colors.white, fontSize: 14)),
            ),
          ),
          const SizedBox(width: 8),
          const CircleAvatar(
            radius: 14,
            backgroundColor: AppColors.primary,
            child: Text('U', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Colors.white)),
          ),
        ],
      );
    }

    return Row(
      mainAxisAlignment: MainAxisAlignment.start,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        CircleAvatar(
          radius: 14,
          backgroundColor: mutedBg,
          child: Text('AI', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: mutedFg)),
        ),
        const SizedBox(width: 8),
        Flexible(
          child: Container(
            constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: mutedBg,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(16),
                topRight: Radius.circular(16),
                bottomLeft: Radius.circular(4),
                bottomRight: Radius.circular(16),
              ),
            ),
            child: _AssistantMessageText(content: message.content),
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
    final onSurface = Theme.of(context).colorScheme.onSurface;
    final scaffoldBg = Theme.of(context).scaffoldBackgroundColor;

    final extracted = extractPayment(content);
    final styleSheet = MarkdownStyleSheet.fromTheme(Theme.of(context)).copyWith(
      p: TextStyle(color: onSurface, fontSize: 14, height: 1.4),
      strong: TextStyle(color: onSurface, fontSize: 14, fontWeight: FontWeight.bold, height: 1.4),
      em: TextStyle(color: onSurface, fontSize: 14, fontStyle: FontStyle.italic, height: 1.4),
      listBullet: TextStyle(color: onSurface, fontSize: 14),
      h1: TextStyle(color: onSurface, fontSize: 16, fontWeight: FontWeight.bold),
      h2: TextStyle(color: onSurface, fontSize: 15, fontWeight: FontWeight.bold),
      h3: TextStyle(color: onSurface, fontSize: 14, fontWeight: FontWeight.w600),
      a: const TextStyle(color: AppColors.primary, decoration: TextDecoration.underline),
      code: TextStyle(color: onSurface, backgroundColor: scaffoldBg, fontSize: 12, fontFamily: 'monospace'),
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
