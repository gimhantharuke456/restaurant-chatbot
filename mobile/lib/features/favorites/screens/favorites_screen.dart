import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/motion/entrance.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/app_network_image.dart';
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

        final byCollection = <String, List<FavoriteModel>>{};
        for (final fav in provider.favorites) {
          byCollection.putIfAbsent(fav.collection, () => []).add(fav);
        }

        final mutedColor = Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.55);

        return RefreshIndicator(
          onRefresh: provider.fetch,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              for (final entry in byCollection.entries) ...[
                Padding(
                  padding: const EdgeInsets.only(bottom: 8, top: 8),
                  child: Row(
                    children: [
                      const Icon(Icons.favorite, color: AppColors.destructive, size: 16),
                      const SizedBox(width: 6),
                      Text(entry.key, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                      const SizedBox(width: 6),
                      Text('(${entry.value.length})',
                          style: TextStyle(color: mutedColor, fontSize: 12)),
                    ],
                  ),
                ),
                for (var i = 0; i < entry.value.length; i++)
                  staggeredEntrance(
                    _FavoriteCard(
                      favorite: entry.value[i],
                      onTap: () => context.push('/restaurants/${entry.value[i].restaurantId}'),
                      onRemove: () => provider.remove(entry.value[i].restaurantId),
                    ),
                    index: i,
                  ),
              ],
            ],
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
    final mutedColor = Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.55);
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              AppNetworkImage(
                url: favorite.coverImageUrl,
                width: 56,
                height: 56,
                borderRadius: BorderRadius.circular(10),
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
                      style: TextStyle(color: mutedColor, fontSize: 12),
                    ),
                    if (favorite.avgRating != null) ...[
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          const Icon(Icons.star, color: AppColors.primary, size: 12),
                          const SizedBox(width: 2),
                          Text(favorite.avgRating!.toStringAsFixed(1),
                              style: TextStyle(color: mutedColor, fontSize: 12)),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              IconButton(
                onPressed: onRemove,
                icon: Icon(Icons.delete_outline, color: mutedColor),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
