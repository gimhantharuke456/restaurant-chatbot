import 'package:flutter/foundation.dart';
import '../data/favorites_repository.dart';
import '../models/favorite_model.dart';

class FavoritesProvider extends ChangeNotifier {
  final FavoritesRepository _repository;

  FavoritesProvider(this._repository);

  List<FavoriteModel> favorites = [];
  bool isLoading = false;
  String? error;

  Future<void> fetch() async {
    isLoading = true;
    error = null;
    notifyListeners();
    try {
      favorites = await _repository.getFavorites();
    } catch (e) {
      error = e.toString();
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<void> remove(String restaurantId) async {
    await _repository.removeFavorite(restaurantId);
    favorites = favorites.where((f) => f.restaurantId != restaurantId).toList();
    notifyListeners();
  }
}
