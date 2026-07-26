import '../../../core/network/api_client.dart';
import '../models/favorite_model.dart';

abstract class FavoritesRepository {
  Future<List<FavoriteModel>> getFavorites();
  Future<bool> checkFavorite(String restaurantId);
  Future<void> addFavorite(String restaurantId, {String collection = 'Favorites'});
  Future<void> removeFavorite(String restaurantId);
}

class ApiFavoritesRepository implements FavoritesRepository {
  final ApiClient _apiClient;

  ApiFavoritesRepository(this._apiClient);

  @override
  Future<List<FavoriteModel>> getFavorites() async {
    final json = await _apiClient.get('/users/me/favorites');
    if (json is! List) return [];
    return json.whereType<Map<String, dynamic>>().map(FavoriteModel.fromJson).toList();
  }

  @override
  Future<bool> checkFavorite(String restaurantId) async {
    final json = await _apiClient.get('/users/me/favorites/$restaurantId/check') as Map<String, dynamic>;
    return json['isFavorited'] as bool? ?? false;
  }

  @override
  Future<void> addFavorite(String restaurantId, {String collection = 'Favorites'}) async {
    await _apiClient.post('/users/me/favorites', body: {
      'restaurantId': restaurantId,
      'collection': collection,
    });
  }

  @override
  Future<void> removeFavorite(String restaurantId) async {
    await _apiClient.delete('/users/me/favorites/$restaurantId');
  }
}
