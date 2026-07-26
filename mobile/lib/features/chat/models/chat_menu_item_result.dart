class ChatMenuItemResult {
  final String id;
  final String restaurantId;
  final String restaurantName;
  final String name;
  final String? description;
  final double price;
  final String category;
  final List<String> dietaryInfo;
  final String? imageUrl;

  const ChatMenuItemResult({
    required this.id,
    required this.restaurantId,
    required this.restaurantName,
    required this.name,
    required this.price,
    required this.category,
    required this.dietaryInfo,
    this.description,
    this.imageUrl,
  });

  factory ChatMenuItemResult.fromJson(Map<String, dynamic> json) {
    return ChatMenuItemResult(
      id: json['id'] as String,
      restaurantId: json['restaurantId'] as String,
      restaurantName: json['restaurantName'] as String? ?? 'Restaurant',
      name: json['name'] as String,
      description: json['description'] as String?,
      price: (json['price'] as num).toDouble(),
      category: json['category'] as String? ?? '',
      dietaryInfo: (json['dietaryInfo'] as List? ?? []).map((e) => e.toString()).toList(),
      imageUrl: json['imageUrl'] as String?,
    );
  }
}
