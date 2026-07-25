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
      totalTables: json['totalTables'] as int? ?? 0,
      bookedTables: json['bookedTables'] as int? ?? 0,
    );
  }
}
