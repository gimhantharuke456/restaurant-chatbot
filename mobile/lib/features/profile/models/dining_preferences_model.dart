class DiningPreferencesModel {
  final List<String> cuisines;
  final List<String> dietaryRestrictions;
  final String? budgetPreference;
  final List<String> seatingPreferences;

  const DiningPreferencesModel({
    this.cuisines = const [],
    this.dietaryRestrictions = const [],
    this.budgetPreference,
    this.seatingPreferences = const [],
  });

  factory DiningPreferencesModel.fromJson(Map<String, dynamic> json) {
    List<String> stringList(dynamic value) =>
        (value as List? ?? []).map((e) => e.toString()).toList();
    return DiningPreferencesModel(
      cuisines: stringList(json['cuisines']),
      dietaryRestrictions: stringList(json['dietaryRestrictions']),
      budgetPreference: json['budgetPreference'] as String?,
      seatingPreferences: stringList(json['seatingPreferences']),
    );
  }

  Map<String, dynamic> toJson() => {
        'cuisines': cuisines,
        'dietaryRestrictions': dietaryRestrictions,
        if (budgetPreference != null) 'budgetPreference': budgetPreference,
        'seatingPreferences': seatingPreferences,
      };
}
