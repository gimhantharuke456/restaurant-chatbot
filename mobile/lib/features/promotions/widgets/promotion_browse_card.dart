import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/app_network_image.dart';
import '../models/promotion_with_restaurant_model.dart';

class PromotionBrowseCard extends StatelessWidget {
  final PromotionWithRestaurantModel promotion;
  final VoidCallback? onTap;

  const PromotionBrowseCard({super.key, required this.promotion, this.onTap});

  @override
  Widget build(BuildContext context) {
    final mutedColor = Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.55);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (promotion.coverImageUrl != null)
              AppNetworkImage(url: promotion.coverImageUrl, height: 120),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          promotion.discountValue != null
                              ? '${promotion.discountValue!.toStringAsFixed(0)}% OFF'
                              : promotion.type,
                          style: const TextStyle(
                            color: AppColors.primary,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(promotion.title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                  const SizedBox(height: 4),
                  Text(
                    promotion.description,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: mutedColor, fontSize: 13),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Icon(Icons.storefront_outlined, size: 14, color: mutedColor),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          '${promotion.restaurantName} · ${promotion.restaurantArea}',
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Ends ${promotion.endDate.day}/${promotion.endDate.month}/${promotion.endDate.year}',
                    style: TextStyle(fontSize: 11, color: mutedColor),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
