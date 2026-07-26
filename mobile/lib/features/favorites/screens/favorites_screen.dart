import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/motion/entrance.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/empty_state_view.dart';
import '../../../shared/widgets/error_retry_view.dart';
import '../../../shared/widgets/loading_view.dart';
import '../models/favorite_model.dart';
import '../providers/favorites_provider.dart';

const _priceLabels = {
  'BUDGET': 'Budget',
  'MODERATE': 'Moderate',
  'EXPENSIVE': 'Expensive',
  'FINE_DINING': 'Fine Dining',
};

class FavoritesScreen extends StatefulWidget {
  const FavoritesScreen({super.key});

  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<FavoritesProvider>().fetch();
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<FavoritesProvider>();

    return Scaffold(
      appBar: AppBar(title: const Text('Saved Restaurants')),
      body: Builder(builder: (context) {
        if (provider.isLoading && provider.favorites.isEmpty) {
          return const LoadingView();
        }
        if (provider.error != null && provider.favorites.isEmpty) {
          return ErrorRetryView(message: provider.error!, onRetry: provider.fetch);
        }
        if (provider.favorites.isEmpty) {
          return const EmptyStateView(
            icon: Icons.favorite_border,
            title: 'No saved restaurants yet',
            subtitle: 'Tap the heart icon on any restaurant to save it here.',
          );
        }

        return RefreshIndicator(
          onRefresh: provider.fetch,
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: provider.favorites.length,
            itemBuilder: (context, index) {
              final fav = provider.favorites[index];
              return staggeredEntrance(
                _FavoriteCard(
                  favorite: fav,
                  onTap: () => context.push('/restaurants/${fav.restaurantId}'),
                  onRemove: () => provider.remove(fav.restaurantId),
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

class _FavoriteCard extends StatelessWidget {
  final FavoriteModel favorite;
  final VoidCallback onTap;
  final VoidCallback onRemove;

  const _FavoriteCard({required this.favorite, required this.onTap, required this.onRemove});

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
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: SizedBox(
                  width: 56,
                  height: 56,
                  child: favorite.coverImageUrl != null
                      ? Image.network(favorite.coverImageUrl!, fit: BoxFit.cover)
                      : Container(
                          color: AppColors.secondary,
                          child: const Icon(Icons.restaurant, color: AppColors.mutedForeground),
                        ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(favorite.restaurantName,
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                    const SizedBox(height: 2),
                    Text(
                      '${favorite.restaurantArea} · ${_priceLabels[favorite.priceRange] ?? favorite.priceRange}',
                      style: const TextStyle(color: AppColors.mutedForeground, fontSize: 12),
                    ),
                    if (favorite.avgRating != null) ...[
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          const Icon(Icons.star, color: AppColors.primary, size: 12),
                          const SizedBox(width: 2),
                          Text(favorite.avgRating!.toStringAsFixed(1),
                              style: const TextStyle(color: AppColors.mutedForeground, fontSize: 12)),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              IconButton(
                onPressed: onRemove,
                icon: const Icon(Icons.delete_outline, color: AppColors.mutedForeground),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
