import 'package:flutter/foundation.dart';
import '../data/promotions_repository.dart';
import '../models/promotion_with_restaurant_model.dart';

class PromotionsProvider extends ChangeNotifier {
  final PromotionsRepository _repository;

  PromotionsProvider(this._repository);

  List<PromotionWithRestaurantModel> promotions = [];
  bool isLoading = false;
  String? error;

  Future<void> fetch() async {
    isLoading = true;
    error = null;
    notifyListeners();
    try {
      promotions = await _repository.getActivePromotions();
    } catch (e) {
      error = e.toString();
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }
}
