import '../../../core/network/api_client.dart';
import '../models/loyalty_model.dart';

abstract class LoyaltyRepository {
  Future<LoyaltyModel> getLoyalty();
  Future<List<LoyaltyTransactionModel>> getLoyaltyHistory({int limit = 20});
}

class ApiLoyaltyRepository implements LoyaltyRepository {
  final ApiClient _apiClient;

  ApiLoyaltyRepository(this._apiClient);

  @override
  Future<LoyaltyModel> getLoyalty() async {
    final json = await _apiClient.get('/users/me/loyalty') as Map<String, dynamic>;
    return LoyaltyModel.fromJson(json);
  }

  @override
  Future<List<LoyaltyTransactionModel>> getLoyaltyHistory({int limit = 20}) async {
    final json = await _apiClient.get('/users/me/loyalty/history', query: {'limit': '$limit'});
    if (json is! List) return [];
    return json.whereType<Map<String, dynamic>>().map(LoyaltyTransactionModel.fromJson).toList();
  }
}
