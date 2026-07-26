import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/motion/entrance.dart';
import '../../../shared/widgets/empty_state_view.dart';
import '../../../shared/widgets/error_retry_view.dart';
import '../../../shared/widgets/loading_view.dart';
import '../providers/promotions_provider.dart';
import '../widgets/promotion_browse_card.dart';

class PromotionsScreen extends StatefulWidget {
  const PromotionsScreen({super.key});

  @override
  State<PromotionsScreen> createState() => _PromotionsScreenState();
}

class _PromotionsScreenState extends State<PromotionsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<PromotionsProvider>().fetch();
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<PromotionsProvider>();

    return Scaffold(
      appBar: AppBar(title: const Text('Promotions & Offers')),
      body: Builder(builder: (context) {
        if (provider.isLoading && provider.promotions.isEmpty) {
          return const LoadingView();
        }
        if (provider.error != null && provider.promotions.isEmpty) {
          return ErrorRetryView(message: provider.error!, onRetry: provider.fetch);
        }
        if (provider.promotions.isEmpty) {
          return const EmptyStateView(
            icon: Icons.local_offer_outlined,
            title: 'No active promotions',
            subtitle: 'Check back later for deals from restaurants near you.',
          );
        }

        return RefreshIndicator(
          onRefresh: provider.fetch,
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: provider.promotions.length,
            itemBuilder: (context, index) {
              final promotion = provider.promotions[index];
              return staggeredEntrance(
                PromotionBrowseCard(
                  promotion: promotion,
                  onTap: () => context.push('/restaurants/${promotion.restaurantId}'),
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
