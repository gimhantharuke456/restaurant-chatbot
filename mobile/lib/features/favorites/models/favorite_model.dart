import 'dart:convert';

class FavoriteModel {
  final String id;
  final String collection;
  final String restaurantId;
  final String restaurantName;
  final String restaurantArea;
  final double? avgRating;
  final String cuisineTypes;
  final String priceRange;
  final String imageUrls;

  const FavoriteModel({
    required this.id,
    required this.collection,
    required this.restaurantId,
    required this.restaurantName,
    required this.restaurantArea,
    required this.cuisineTypes,
    required this.priceRange,
    required this.imageUrls,
    this.avgRating,
  });

  List<String> get cuisineList {
    try {
      final decoded = jsonDecode(cuisineTypes);
      if (decoded is List) return decoded.map((e) => e.toString()).toList();
      return [cuisineTypes];
    } catch (_) {
      return [cuisineTypes];
    }
  }

  String? get coverImageUrl {
    try {
      final decoded = jsonDecode(imageUrls);
      if (decoded is List && decoded.isNotEmpty) return decoded.first.toString();
    } catch (_) {}
    return null;
  }

  factory FavoriteModel.fromJson(Map<String, dynamic> json) {
    final restaurant = json['restaurant'] as Map<String, dynamic>? ?? {};
    return FavoriteModel(
      id: json['id'] as String,
      collection: json['collection'] as String? ?? 'Favorites',
      restaurantId: restaurant['id'] as String? ?? json['restaurantId'] as String,
      restaurantName: restaurant['name'] as String? ?? 'Restaurant',
      restaurantArea: restaurant['area'] as String? ?? '',
      avgRating: (restaurant['avgRating'] as num?)?.toDouble(),
      cuisineTypes: restaurant['cuisineTypes'] as String? ?? '[]',
      priceRange: restaurant['priceRange'] as String? ?? '',
      imageUrls: restaurant['imageUrls'] as String? ?? '[]',
    );
  }
}
