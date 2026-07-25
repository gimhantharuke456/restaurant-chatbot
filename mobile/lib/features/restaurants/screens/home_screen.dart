import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../shared/widgets/empty_state_view.dart';
import '../../../shared/widgets/error_retry_view.dart';
import '../../../shared/widgets/loading_view.dart';
import '../data/restaurant_repository.dart';
import '../providers/restaurant_provider.dart';
import '../widgets/restaurant_card.dart';

const _priceRanges = ['BUDGET', 'MODERATE', 'EXPENSIVE', 'FINE_DINING'];

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _searchController = TextEditingController();
  String? _selectedPriceRange;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<RestaurantProvider>().fetchRestaurants();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _applyFilters() {
    context.read<RestaurantProvider>().fetchRestaurants(
          filters: RestaurantFilters(
            search: _searchController.text.trim(),
            priceRange: _selectedPriceRange,
          ),
        );
  }

  @override
  Widget build(BuildContext context) {
    final restaurantProvider = context.watch<RestaurantProvider>();

    return Scaffold(
      appBar: AppBar(title: const Text('Discover restaurants')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: TextField(
              key: const Key('home_search_field'),
              controller: _searchController,
              decoration: const InputDecoration(
                hintText: 'Search restaurants…',
                prefixIcon: Icon(Icons.search),
              ),
              onSubmitted: (_) => _applyFilters(),
            ),
          ),
          SizedBox(
            height: 48,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              children: _priceRanges.map((range) {
                final selected = _selectedPriceRange == range;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    key: Key('filter_chip_$range'),
                    label: Text(range),
                    selected: selected,
                    onSelected: (isSelected) {
                      setState(() => _selectedPriceRange = isSelected ? range : null);
                      _applyFilters();
                    },
                  ),
                );
              }).toList(),
            ),
          ),
          Expanded(
            child: Builder(builder: (context) {
              if (restaurantProvider.isLoading && restaurantProvider.restaurants.isEmpty) {
                return const LoadingView();
              }
              if (restaurantProvider.error != null && restaurantProvider.restaurants.isEmpty) {
                return ErrorRetryView(message: restaurantProvider.error!, onRetry: _applyFilters);
              }
              if (restaurantProvider.restaurants.isEmpty) {
                return const EmptyStateView(
                  icon: Icons.search_off,
                  title: 'No restaurants found',
                  subtitle: 'Try adjusting your search or filters.',
                );
              }
              return ListView.builder(
                itemCount: restaurantProvider.restaurants.length,
                itemBuilder: (context, index) {
                  final restaurant = restaurantProvider.restaurants[index];
                  return RestaurantCard(
                    restaurant: restaurant,
                    onTap: () => context.push('/restaurants/${restaurant.id}'),
                    index: index,
                  );
                },
              );
            }),
          ),
        ],
      ),
    );
  }
}
