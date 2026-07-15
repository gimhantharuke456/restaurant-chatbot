import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/error_retry_view.dart';
import '../../../shared/widgets/loading_view.dart';
import '../providers/restaurant_detail_provider.dart';

class RestaurantDetailScreen extends StatefulWidget {
  final String restaurantId;

  const RestaurantDetailScreen({super.key, required this.restaurantId});

  @override
  State<RestaurantDetailScreen> createState() => _RestaurantDetailScreenState();
}

class _RestaurantDetailScreenState extends State<RestaurantDetailScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<RestaurantDetailProvider>().load(widget.restaurantId);
    });
  }

  @override
  Widget build(BuildContext context) {
    final detail = context.watch<RestaurantDetailProvider>();

    return Scaffold(
      appBar: AppBar(title: Text(detail.restaurant?.name ?? 'Restaurant')),
      body: Builder(builder: (context) {
        if (detail.isLoading && detail.restaurant == null) {
          return const LoadingView();
        }
        if (detail.error != null && detail.restaurant == null) {
          return ErrorRetryView(
            message: detail.error!,
            onRetry: () => detail.load(widget.restaurantId),
          );
        }
        final restaurant = detail.restaurant;
        if (restaurant == null) return const SizedBox.shrink();

        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: SizedBox(
                height: 180,
                width: double.infinity,
                child: restaurant.coverImageUrl != null
                    ? Image.network(restaurant.coverImageUrl!, fit: BoxFit.cover)
                    : Container(color: AppColors.secondary),
              ),
            ),
            const SizedBox(height: 16),
            Text(restaurant.name, style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 4),
            Text(
              '${restaurant.address}, ${restaurant.area}',
              style: const TextStyle(color: AppColors.mutedForeground),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.star, color: AppColors.primary, size: 16),
                const SizedBox(width: 4),
                Text(
                  restaurant.avgRating != null
                      ? '${restaurant.avgRating!.toStringAsFixed(1)} (${restaurant.totalReviews} reviews)'
                      : 'No reviews yet',
                ),
              ],
            ),
            if (detail.promotions.isNotEmpty) ...[
              const SizedBox(height: 16),
              ...detail.promotions.map((promo) => Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.accent,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(promo.title, style: const TextStyle(fontWeight: FontWeight.w600)),
                        Text(promo.description, style: const TextStyle(color: AppColors.mutedForeground)),
                      ],
                    ),
                  )),
            ],
            const SizedBox(height: 16),
            Text('Menu', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            if (detail.menu.isEmpty)
              const Text('No menu items yet', style: TextStyle(color: AppColors.mutedForeground)),
            ...detail.menu.take(5).map((item) => ListTile(
                  key: Key('menu_item_${item.id}'),
                  contentPadding: EdgeInsets.zero,
                  title: Text(item.name),
                  subtitle: item.description != null ? Text(item.description!) : null,
                  trailing: Text('LKR ${item.price.toStringAsFixed(0)}'),
                )),
            const SizedBox(height: 16),
            Text('Reviews', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            if (detail.reviews == null || detail.reviews!.data.isEmpty)
              const Text('No reviews yet', style: TextStyle(color: AppColors.mutedForeground)),
            ...?detail.reviews?.data.take(3).map((review) => ListTile(
                  key: Key('review_${review.id}'),
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.star, color: AppColors.primary),
                  title: Text(review.userName ?? 'Diner'),
                  subtitle: Text(review.comment ?? ''),
                  trailing: Text('${review.rating}/5'),
                )),
            const SizedBox(height: 24),
            ElevatedButton(
              key: const Key('book_table_button'),
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Booking will be available in the next update')),
                );
              },
              child: const Text('Book a table'),
            ),
          ],
        );
      }),
    );
  }
}
