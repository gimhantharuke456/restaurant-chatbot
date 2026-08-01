class SlotModel {
  final String time;
  final bool available;
  final int totalTables;
  final int bookedTables;

  const SlotModel({
    required this.time,
    required this.available,
    required this.totalTables,
    required this.bookedTables,
  });

  factory SlotModel.fromJson(Map<String, dynamic> json) {
    return SlotModel(
      time: json['time'] as String,
      available: json['available'] as bool? ?? true,
      // capacity-based endpoint uses maxCapacity/bookedSeats; Firestore-based uses totalTables/bookedTables
      totalTables: (json['maxCapacity'] ?? json['totalTables']) as int? ?? 0,
      bookedTables: (json['bookedSeats'] ?? json['bookedTables']) as int? ?? 0,
    );
  }
}
