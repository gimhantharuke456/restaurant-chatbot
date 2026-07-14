import '../../../core/network/api_client.dart';
import '../models/restaurant_model.dart';

class RestaurantFilters {
  final String? search;
  final String? area;
  final String? cuisine;
  final String? priceRange;
  final double? minRating;
  final int page;

  const RestaurantFilters({
    this.search,
    this.area,
    this.cuisine,
    this.priceRange,
    this.minRating,
    this.page = 1,
  });

  Map<String, String> toQuery() {
    final query = <String, String>{'page': page.toString()};
    if (search != null && search!.isNotEmpty) query['search'] = search!;
    if (area != null && area!.isNotEmpty) query['area'] = area!;
    if (cuisine != null && cuisine!.isNotEmpty) query['cuisine'] = cuisine!;
    if (priceRange != null) query['priceRange'] = priceRange!;
    if (minRating != null) query['minRating'] = minRating.toString();
    return query;
  }
}

abstract class RestaurantRepository {
  Future<RestaurantPage> listRestaurants(RestaurantFilters filters);
  Future<RestaurantModel> getRestaurantById(String id);
}

class ApiRestaurantRepository implements RestaurantRepository {
  final ApiClient _apiClient;

  ApiRestaurantRepository(this._apiClient);

  @override
  Future<RestaurantPage> listRestaurants(RestaurantFilters filters) async {
    final json = await _apiClient.get('/restaurants', query: filters.toQuery());
    return RestaurantPage.fromJson(json as Map<String, dynamic>);
  }

  @override
  Future<RestaurantModel> getRestaurantById(String id) async {
    final json = await _apiClient.get('/restaurants/$id');
    return RestaurantModel.fromJson(json as Map<String, dynamic>);
  }
}
