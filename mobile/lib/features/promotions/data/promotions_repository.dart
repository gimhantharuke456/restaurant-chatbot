import '../../../core/network/api_client.dart';
import '../models/promotion_with_restaurant_model.dart';

abstract class PromotionsRepository {
  Future<List<PromotionWithRestaurantModel>> getActivePromotions();
}

class ApiPromotionsRepository implements PromotionsRepository {
  final ApiClient _apiClient;

  ApiPromotionsRepository(this._apiClient);

  @override
  Future<List<PromotionWithRestaurantModel>> getActivePromotions() async {
    final json = await _apiClient.get('/restaurants/promotions');
    if (json is! List) return [];
    return json.whereType<Map<String, dynamic>>().map(PromotionWithRestaurantModel.fromJson).toList();
  }
}
