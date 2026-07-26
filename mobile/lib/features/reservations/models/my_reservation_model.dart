class MyReservationModel {
  final String id;
  final String restaurantId;
  final String restaurantName;
  final String restaurantArea;
  final DateTime date;
  final String time;
  final int partySize;
  final String status;
  final int? preOrderItemCount;
  final double? preOrderAmount;
  final int? reviewRating;
  final String? reviewComment;

  const MyReservationModel({
    required this.id,
    required this.restaurantId,
    required this.restaurantName,
    required this.restaurantArea,
    required this.date,
    required this.time,
    required this.partySize,
    required this.status,
    this.preOrderItemCount,
    this.preOrderAmount,
    this.reviewRating,
    this.reviewComment,
  });

  bool get canCancel => status == 'PENDING' || status == 'CONFIRMED';
  bool get canReview => status == 'COMPLETED';
  bool get hasReview => reviewRating != null;

  MyReservationModel copyWith({
    String? status,
    int? reviewRating,
    String? reviewComment,
  }) {
    return MyReservationModel(
      id: id,
      restaurantId: restaurantId,
      restaurantName: restaurantName,
      restaurantArea: restaurantArea,
      date: date,
      time: time,
      partySize: partySize,
      status: status ?? this.status,
      preOrderItemCount: preOrderItemCount,
      preOrderAmount: preOrderAmount,
      reviewRating: reviewRating ?? this.reviewRating,
      reviewComment: reviewComment ?? this.reviewComment,
    );
  }

  factory MyReservationModel.fromJson(Map<String, dynamic> json) {
    final restaurant = json['restaurant'] as Map<String, dynamic>?;
    final payment = json['payment'] as Map<String, dynamic>?;
    final orderItems = payment?['orderItems'] as List?;
    final review = json['review'] as Map<String, dynamic>?;

    return MyReservationModel(
      id: json['id'] as String,
      restaurantId: json['restaurantId'] as String,
      restaurantName: restaurant?['name'] as String? ?? 'Restaurant',
      restaurantArea: restaurant?['area'] as String? ?? '',
      date: DateTime.parse(json['date'] as String),
      time: json['time'] as String,
      partySize: json['partySize'] as int,
      status: json['status'] as String,
      preOrderItemCount: orderItems?.length,
      preOrderAmount: (payment?['amount'] as num?)?.toDouble(),
      reviewRating: review?['rating'] as int?,
      reviewComment: review?['comment'] as String?,
    );
  }
}
