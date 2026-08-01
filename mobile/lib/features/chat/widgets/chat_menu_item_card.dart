import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/app_network_image.dart';
import '../models/chat_menu_item_result.dart';
import '../providers/chat_provider.dart';

class ChatMenuItemList extends StatelessWidget {
  final List<ChatMenuItemResult> items;

  const ChatMenuItemList({super.key, required this.items});

  @override
  Widget build(BuildContext context) {
    final mutedColor = Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.55);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 6, left: 4),
          child: Text(
            "${items.first.restaurantName}'s menu · tap a dish to start ordering",
            style: TextStyle(color: mutedColor, fontSize: 12),
          ),
        ),
        ...items.map((item) => ChatMenuItemCard(item: item)),
      ],
    );
  }
}

class ChatMenuItemCard extends StatelessWidget {
  final ChatMenuItemResult item;

  const ChatMenuItemCard({super.key, required this.item});

  @override
  Widget build(BuildContext context) {
    final mutedColor = Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.55);
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () => context.read<ChatProvider>().sendMessage("I'd like to order ${item.name}"),
          child: Padding(
            padding: const EdgeInsets.all(10),
            child: Row(
              children: [
                AppNetworkImage(
                  url: item.imageUrl,
                  width: 56,
                  height: 56,
                  borderRadius: BorderRadius.circular(10),
                  fallbackIcon: Icons.restaurant_menu,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.name,
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                      ),
                      if (item.description != null && item.description!.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(
                          item.description!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(color: mutedColor, fontSize: 12),
                        ),
                      ],
                      const SizedBox(height: 4),
                      Text(
                        'LKR ${item.price.toStringAsFixed(0)}',
                        style: const TextStyle(
                          color: AppColors.primary, fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right, size: 18, color: mutedColor),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
