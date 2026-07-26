import 'dart:convert';

class ChatRestaurantResult {
  final String id;
  final String name;
  final String? description;
  final String address;
  final String area;
  final String cuisineTypes;
  final String priceRange;
  final double? avgRating;
  final String imageUrls;

  const ChatRestaurantResult({
    required this.id,
    required this.name,
    required this.address,
    required this.area,
    required this.cuisineTypes,
    required this.priceRange,
    required this.imageUrls,
    this.description,
    this.avgRating,
  });

  factory ChatRestaurantResult.fromJson(Map<String, dynamic> json) {
    return ChatRestaurantResult(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      address: json['address'] as String,
      area: json['area'] as String,
      cuisineTypes: json['cuisineTypes'] as String? ?? '[]',
      priceRange: json['priceRange'] as String,
      avgRating: (json['avgRating'] as num?)?.toDouble(),
      imageUrls: json['imageUrls'] as String? ?? '[]',
    );
  }

  /// `cuisineTypes` is a JSON-encoded string column from the DB (e.g.
  /// `["Seafood","Sri Lankan"]`). Falls back to treating the raw string as a
  /// single cuisine if it isn't valid JSON — same fallback the web client uses.
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
}
