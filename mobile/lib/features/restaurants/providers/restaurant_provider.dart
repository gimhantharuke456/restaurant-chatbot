import 'package:flutter/foundation.dart';
import '../data/restaurant_repository.dart';
import '../models/restaurant_model.dart';

class RestaurantProvider extends ChangeNotifier {
  final RestaurantRepository _repository;

  RestaurantProvider(this._repository);

  List<RestaurantModel> restaurants = [];
  bool isLoading = false;
  String? error;
  RestaurantFilters filters = const RestaurantFilters();

  Future<void> fetchRestaurants({RestaurantFilters? filters}) async {
    if (filters != null) this.filters = filters;
    isLoading = true;
    error = null;
    notifyListeners();
    try {
      final page = await _repository.listRestaurants(this.filters);
      restaurants = page.data;
    } catch (e) {
      error = e.toString();
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }
}
