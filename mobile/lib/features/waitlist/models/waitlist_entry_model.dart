class WaitlistEntryModel {
  final String id;
  final String restaurantId;
  final String restaurantName;
  final DateTime date;
  final String time;
  final int partySize;
  final int position;
  final String status;

  const WaitlistEntryModel({
    required this.id,
    required this.restaurantId,
    required this.restaurantName,
    required this.date,
    required this.time,
    required this.partySize,
    required this.position,
    required this.status,
  });

  bool get canLeave => status == 'WAITING' || status == 'NOTIFIED';

  factory WaitlistEntryModel.fromJson(Map<String, dynamic> json) {
    final restaurant = json['restaurant'] as Map<String, dynamic>? ?? {};
    return WaitlistEntryModel(
      id: json['id'] as String,
      restaurantId: restaurant['id'] as String? ?? json['restaurantId'] as String,
      restaurantName: restaurant['name'] as String? ?? 'Restaurant',
      date: DateTime.parse(json['date'] as String),
      time: json['time'] as String,
      partySize: json['partySize'] as int? ?? 1,
      position: json['position'] as int? ?? 0,
      status: json['status'] as String? ?? 'WAITING',
    );
  }
}
