import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
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
  bool _nearMeActive = false;
  bool _locating = false;

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
    setState(() => _nearMeActive = false);
    context.read<RestaurantProvider>().fetchRestaurants(
          filters: RestaurantFilters(
            search: _searchController.text.trim(),
            priceRange: _selectedPriceRange,
          ),
        );
  }

  Future<void> _findNearMe() async {
    setState(() => _locating = true);
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        _showError('Location services are disabled. Enable them to see restaurants near you.');
        return;
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
        _showError('Location permission denied — enable it to see restaurants near you.');
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.medium),
      );
      if (!mounted) return;
      setState(() => _nearMeActive = true);
      await context.read<RestaurantProvider>().fetchRestaurants(
            filters: RestaurantFilters(lat: position.latitude, lng: position.longitude),
          );
    } catch (_) {
      _showError("Couldn't get your location. Please try again.");
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  void _showError(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final restaurantProvider = context.watch<RestaurantProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Discover restaurants'),
        actions: [
          if (_nearMeActive)
            IconButton(
              icon: const Icon(Icons.close),
              tooltip: 'Clear near me',
              onPressed: _applyFilters,
            )
          else
            IconButton(
              icon: _locating
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.my_location),
              tooltip: 'Near me',
              onPressed: _locating ? null : _findNearMe,
            ),
        ],
      ),
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
          if (_nearMeActive)
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text('Sorted by distance from you', style: TextStyle(color: AppColors.mutedForeground, fontSize: 12)),
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
