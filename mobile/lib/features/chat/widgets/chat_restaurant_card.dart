import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/app_network_image.dart';
import '../models/chat_restaurant_result.dart';

const _priceLabels = {
  'BUDGET': 'Budget',
  'MODERATE': 'Moderate',
  'EXPENSIVE': 'Expensive',
  'FINE_DINING': 'Fine Dining',
};

class ChatRestaurantList extends StatelessWidget {
  final List<ChatRestaurantResult> items;

  const ChatRestaurantList({super.key, required this.items});

  @override
  Widget build(BuildContext context) {
    final muted = Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.55);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 6, left: 4),
          child: Text(
            'Found ${items.length} restaurant${items.length != 1 ? 's' : ''}',
            style: TextStyle(color: muted, fontSize: 12),
          ),
        ),
        ...items.map((r) => ChatRestaurantCard(restaurant: r)),
      ],
    );
  }
}

class ChatRestaurantCard extends StatelessWidget {
  final ChatRestaurantResult restaurant;

  const ChatRestaurantCard({super.key, required this.restaurant});

  @override
  Widget build(BuildContext context) {
    final muted = Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.55);
    final cardColor = Theme.of(context).cardColor;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: cardColor,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () => context.push('/restaurants/${restaurant.id}'),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    AppNetworkImage(
                      url: restaurant.coverImageUrl,
                      width: 48,
                      height: 48,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        restaurant.name,
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                      ),
                    ),
                    if (restaurant.avgRating != null) ...[
                      const Icon(Icons.star, color: AppColors.primary, size: 13),
                      const SizedBox(width: 2),
                      Text(
                        restaurant.avgRating!.toStringAsFixed(1),
                        style: const TextStyle(color: AppColors.primary, fontSize: 12),
                      ),
                    ],
                    const SizedBox(width: 4),
                    Icon(Icons.chevron_right, size: 16, color: muted),
                  ],
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Icon(Icons.location_on_outlined, size: 13, color: muted),
                    const SizedBox(width: 3),
                    Text(restaurant.area, style: TextStyle(color: muted, fontSize: 12)),
                    Text(' · ', style: TextStyle(color: muted, fontSize: 12)),
                    Text(
                      _priceLabels[restaurant.priceRange] ?? restaurant.priceRange,
                      style: TextStyle(color: muted, fontSize: 12),
                    ),
                  ],
                ),
                if (restaurant.cuisineList.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: restaurant.cuisineList
                        .map((c) => Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(c, style: const TextStyle(color: AppColors.primary, fontSize: 10)),
                            ))
                        .toList(),
                  ),
                ],
                if (restaurant.description != null && restaurant.description!.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(
                    restaurant.description!,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: muted, fontSize: 12, height: 1.3),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
