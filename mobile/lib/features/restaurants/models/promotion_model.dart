class PromotionModel {
  final String id;
  final String title;
  final String description;
  final String type;
  final double? discountValue;
  final String? imageUrl;

  const PromotionModel({
    required this.id,
    required this.title,
    required this.description,
    required this.type,
    this.discountValue,
    this.imageUrl,
  });

  factory PromotionModel.fromJson(Map<String, dynamic> json) {
    return PromotionModel(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      type: json['type'] as String,
      discountValue: (json['discountValue'] as num?)?.toDouble(),
      imageUrl: json['imageUrl'] as String?,
    );
  }
}
