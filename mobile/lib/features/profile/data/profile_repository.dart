import '../../../core/network/api_client.dart';
import '../../auth/models/user_model.dart';
import '../models/dining_preferences_model.dart';

abstract class ProfileRepository {
  Future<UserModel> updateProfile({String? name, String? phone});
  Future<DiningPreferencesModel> getPreferences();
  Future<DiningPreferencesModel> updatePreferences(DiningPreferencesModel preferences);
}

class ApiProfileRepository implements ProfileRepository {
  final ApiClient _apiClient;

  ApiProfileRepository(this._apiClient);

  @override
  Future<UserModel> updateProfile({String? name, String? phone}) async {
    final json = await _apiClient.put('/users/me', body: {
      if (name != null && name.isNotEmpty) 'name': name,
      'phone': ?phone,
    }) as Map<String, dynamic>;
    return UserModel.fromJson(json);
  }

  @override
  Future<DiningPreferencesModel> getPreferences() async {
    final json = await _apiClient.get('/users/me/preferences');
    return DiningPreferencesModel.fromJson(json as Map<String, dynamic>? ?? {});
  }

  @override
  Future<DiningPreferencesModel> updatePreferences(DiningPreferencesModel preferences) async {
    final json = await _apiClient.put('/users/me/preferences', body: preferences.toJson())
        as Map<String, dynamic>;
    final data = json['diningPreferences'] as Map<String, dynamic>? ?? {};
    return DiningPreferencesModel.fromJson(data);
  }
}
