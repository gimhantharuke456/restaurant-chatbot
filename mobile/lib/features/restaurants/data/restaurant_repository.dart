import '../../../core/network/api_client.dart';
import '../models/menu_item_model.dart';
import '../models/promotion_model.dart';
import '../models/restaurant_model.dart';
import '../models/review_model.dart';

class RestaurantFilters {
  final String? search;
  final String? area;
  final String? cuisine;
  final String? priceRange;
  final double? minRating;
  final double? lat;
  final double? lng;
  final double? radiusKm;
  final int page;

  const RestaurantFilters({
    this.search,
    this.area,
    this.cuisine,
    this.priceRange,
    this.minRating,
    this.lat,
    this.lng,
    this.radiusKm,
    this.page = 1,
  });

  Map<String, String> toQuery() {
    final query = <String, String>{'page': page.toString()};
    if (search != null && search!.isNotEmpty) query['search'] = search!;
    if (area != null && area!.isNotEmpty) query['area'] = area!;
    if (cuisine != null && cuisine!.isNotEmpty) query['cuisine'] = cuisine!;
    if (priceRange != null) query['priceRange'] = priceRange!;
    if (minRating != null) query['minRating'] = minRating.toString();
    if (lat != null) query['lat'] = lat.toString();
    if (lng != null) query['lng'] = lng.toString();
    if (radiusKm != null) query['radiusKm'] = radiusKm.toString();
    return query;
  }
}

abstract class RestaurantRepository {
  Future<RestaurantPage> listRestaurants(RestaurantFilters filters);
  Future<RestaurantModel> getRestaurantById(String id);
  Future<List<MenuItemModel>> getMenu(String restaurantId);
  Future<ReviewPage> getReviews(String restaurantId);
  Future<List<PromotionModel>> getPromotions(String restaurantId);
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

  @override
  Future<List<MenuItemModel>> getMenu(String restaurantId) async {
    final json = await _apiClient.get('/restaurants/$restaurantId/menu');
    return (json as List).map((e) => MenuItemModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  @override
  Future<ReviewPage> getReviews(String restaurantId) async {
    final json = await _apiClient.get('/restaurants/$restaurantId/reviews');
    return ReviewPage.fromJson(json as Map<String, dynamic>);
  }

  @override
  Future<List<PromotionModel>> getPromotions(String restaurantId) async {
    final json = await _apiClient.get('/restaurants/$restaurantId/promotions');
    return (json as List).map((e) => PromotionModel.fromJson(e as Map<String, dynamic>)).toList();
  }
}
