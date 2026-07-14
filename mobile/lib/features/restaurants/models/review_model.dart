class ReviewModel {
  final String id;
  final int rating;
  final String? comment;
  final String? userName;
  final String createdAt;

  const ReviewModel({
    required this.id,
    required this.rating,
    required this.createdAt,
    this.comment,
    this.userName,
  });

  factory ReviewModel.fromJson(Map<String, dynamic> json) {
    final user = json['user'] as Map<String, dynamic>?;
    return ReviewModel(
      id: json['id'] as String,
      rating: json['rating'] as int,
      comment: json['comment'] as String?,
      userName: user?['name'] as String?,
      createdAt: json['createdAt'] as String,
    );
  }
}

class ReviewPage {
  final List<ReviewModel> data;
  final int total;
  final double? avgRating;

  const ReviewPage({required this.data, required this.total, this.avgRating});

  factory ReviewPage.fromJson(Map<String, dynamic> json) {
    return ReviewPage(
      data: (json['data'] as List)
          .map((e) => ReviewModel.fromJson(e as Map<String, dynamic>))
          .toList(),
      total: json['total'] as int,
      avgRating: (json['avgRating'] as num?)?.toDouble(),
    );
  }
}
