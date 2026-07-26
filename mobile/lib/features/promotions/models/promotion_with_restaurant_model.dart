class PromotionWithRestaurantModel {
  final String id;
  final String title;
  final String description;
  final String type;
  final double? discountValue;
  final String? imageUrl;
  final DateTime endDate;
  final String restaurantId;
  final String restaurantName;
  final String restaurantArea;
  final List<String> cuisineTypes;
  final String? coverImageUrl;

  const PromotionWithRestaurantModel({
    required this.id,
    required this.title,
    required this.description,
    required this.type,
    required this.endDate,
    required this.restaurantId,
    required this.restaurantName,
    required this.restaurantArea,
    required this.cuisineTypes,
    this.discountValue,
    this.imageUrl,
    this.coverImageUrl,
  });

  factory PromotionWithRestaurantModel.fromJson(Map<String, dynamic> json) {
    final restaurant = json['restaurant'] as Map<String, dynamic>? ?? {};
    final imageUrls = (restaurant['imageUrls'] as List? ?? []).map((e) => e.toString()).toList();
    return PromotionWithRestaurantModel(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      type: json['type'] as String,
      discountValue: (json['discountValue'] as num?)?.toDouble(),
      imageUrl: json['imageUrl'] as String?,
      endDate: DateTime.parse(json['endDate'] as String),
      restaurantId: restaurant['id'] as String,
      restaurantName: restaurant['name'] as String? ?? 'Restaurant',
      restaurantArea: restaurant['area'] as String? ?? '',
      cuisineTypes: (restaurant['cuisineTypes'] as List? ?? []).map((e) => e.toString()).toList(),
      coverImageUrl: imageUrls.isNotEmpty ? imageUrls.first : null,
    );
  }
}
