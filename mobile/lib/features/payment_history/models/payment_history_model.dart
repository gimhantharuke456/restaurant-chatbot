class PaymentHistoryModel {
  final String id;
  final String restaurantName;
  final DateTime reservationDate;
  final String reservationTime;
  final double amount;
  final String currency;
  final String status;
  final String? receiptUrl;
  final DateTime createdAt;

  const PaymentHistoryModel({
    required this.id,
    required this.restaurantName,
    required this.reservationDate,
    required this.reservationTime,
    required this.amount,
    required this.currency,
    required this.status,
    required this.createdAt,
    this.receiptUrl,
  });

  factory PaymentHistoryModel.fromJson(Map<String, dynamic> json) {
    final reservation = json['reservation'] as Map<String, dynamic>? ?? {};
    final restaurant = reservation['restaurant'] as Map<String, dynamic>? ?? {};
    return PaymentHistoryModel(
      id: json['id'] as String,
      restaurantName: restaurant['name'] as String? ?? 'Restaurant',
      reservationDate: DateTime.parse(reservation['date'] as String? ?? json['createdAt'] as String),
      reservationTime: reservation['time'] as String? ?? '',
      amount: (json['amount'] as num).toDouble(),
      currency: json['currency'] as String? ?? 'LKR',
      status: json['status'] as String? ?? 'PENDING',
      receiptUrl: json['receiptUrl'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}
