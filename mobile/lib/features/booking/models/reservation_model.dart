class ReservationModel {
  final String id;
  final String restaurantId;
  final String date;
  final String time;
  final int partySize;
  final String status;

  const ReservationModel({
    required this.id,
    required this.restaurantId,
    required this.date,
    required this.time,
    required this.partySize,
    required this.status,
  });

  factory ReservationModel.fromJson(Map<String, dynamic> json) {
    return ReservationModel(
      id: json['id'] as String,
      restaurantId: json['restaurantId'] as String,
      date: json['date'] as String,
      time: json['time'] as String,
      partySize: json['partySize'] as int,
      status: json['status'] as String,
    );
  }
}
