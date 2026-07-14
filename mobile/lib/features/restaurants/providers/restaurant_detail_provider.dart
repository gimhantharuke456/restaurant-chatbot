import 'package:flutter/foundation.dart';
import '../data/restaurant_repository.dart';
import '../models/menu_item_model.dart';
import '../models/promotion_model.dart';
import '../models/restaurant_model.dart';
import '../models/review_model.dart';

class RestaurantDetailProvider extends ChangeNotifier {
  final RestaurantRepository _repository;

  RestaurantDetailProvider(this._repository);

  RestaurantModel? restaurant;
  List<MenuItemModel> menu = [];
  ReviewPage? reviews;
  List<PromotionModel> promotions = [];
  bool isLoading = false;
  String? error;

  Future<void> load(String restaurantId) async {
    isLoading = true;
    error = null;
    notifyListeners();
    try {
      final results = await Future.wait([
        _repository.getRestaurantById(restaurantId),
        _repository.getMenu(restaurantId),
        _repository.getReviews(restaurantId),
        _repository.getPromotions(restaurantId),
      ]);
      restaurant = results[0] as RestaurantModel;
      menu = results[1] as List<MenuItemModel>;
      reviews = results[2] as ReviewPage;
      promotions = results[3] as List<PromotionModel>;
    } catch (e) {
      error = e.toString();
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }
}
