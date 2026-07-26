class LoyaltyModel {
  final int points;
  final String tier;
  final int totalEarned;

  const LoyaltyModel({required this.points, required this.tier, required this.totalEarned});

  factory LoyaltyModel.fromJson(Map<String, dynamic> json) {
    return LoyaltyModel(
      points: json['points'] as int? ?? 0,
      tier: json['tier'] as String? ?? 'BRONZE',
      totalEarned: json['totalEarned'] as int? ?? 0,
    );
  }
}

class LoyaltyTransactionModel {
  final String id;
  final int points;
  final String type;
  final String description;
  final DateTime createdAt;

  const LoyaltyTransactionModel({
    required this.id,
    required this.points,
    required this.type,
    required this.description,
    required this.createdAt,
  });

  factory LoyaltyTransactionModel.fromJson(Map<String, dynamic> json) {
    return LoyaltyTransactionModel(
      id: json['id'] as String,
      points: json['points'] as int,
      type: json['type'] as String,
      description: json['description'] as String? ?? '',
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}
