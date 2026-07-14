import 'dart:convert';

class MenuItemModel {
  final String id;
  final String name;
  final String? description;
  final double price;
  final String category;
  final List<String> dietaryInfo;
  final String? imageUrl;

  const MenuItemModel({
    required this.id,
    required this.name,
    required this.price,
    required this.category,
    required this.dietaryInfo,
    this.description,
    this.imageUrl,
  });

  factory MenuItemModel.fromJson(Map<String, dynamic> json) {
    var parsedDietaryInfo = <String>[];
    final rawDietaryInfo = json['dietaryInfo'];
    if (rawDietaryInfo is String) {
      try {
        parsedDietaryInfo = List<String>.from(jsonDecode(rawDietaryInfo) as List);
      } catch (_) {
        parsedDietaryInfo = <String>[];
      }
    } else if (rawDietaryInfo is List) {
      parsedDietaryInfo = List<String>.from(rawDietaryInfo);
    }

    return MenuItemModel(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      price: (json['price'] as num).toDouble(),
      category: json['category'] as String,
      dietaryInfo: parsedDietaryInfo,
      imageUrl: json['imageUrl'] as String?,
    );
  }
}
