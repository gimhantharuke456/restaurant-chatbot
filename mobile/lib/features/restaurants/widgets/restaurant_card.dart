import 'package:flutter/material.dart';
import '../../../core/motion/entrance.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/app_network_image.dart';
import '../models/restaurant_model.dart';

class RestaurantCard extends StatelessWidget {
  final RestaurantModel restaurant;
  final VoidCallback onTap;
  final int index;

  const RestaurantCard({
    super.key,
    required this.restaurant,
    required this.onTap,
    this.index = 0,
  });

  @override
  Widget build(BuildContext context) {
    return staggeredEntrance(_buildCard(context), index: index);
  }

  Widget _buildCard(BuildContext context) {
    final muted = Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.55);

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              AppNetworkImage(
                url: restaurant.imageUrls.isNotEmpty ? restaurant.imageUrls.first : null,
                width: 64,
                height: 64,
                borderRadius: BorderRadius.circular(10),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      restaurant.name,
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      restaurant.distanceKm != null
                          ? '${restaurant.area} · ${restaurant.priceRange} · ${restaurant.distanceKm} km away'
                          : '${restaurant.area} · ${restaurant.priceRange}',
                      style: TextStyle(color: muted, fontSize: 13),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(Icons.star, color: AppColors.primary, size: 14),
                        const SizedBox(width: 4),
                        Text(
                          restaurant.avgRating != null
                              ? '${restaurant.avgRating!.toStringAsFixed(1)} (${restaurant.totalReviews})'
                              : 'No reviews yet',
                          style: TextStyle(color: muted, fontSize: 12),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: muted),
            ],
          ),
        ),
      ),
    );
  }
}
