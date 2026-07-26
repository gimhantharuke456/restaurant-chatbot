import 'package:flutter/foundation.dart';
import '../../auth/models/user_model.dart';
import '../data/profile_repository.dart';
import '../models/dining_preferences_model.dart';

class ProfileProvider extends ChangeNotifier {
  final ProfileRepository _repository;

  ProfileProvider(this._repository);

  DiningPreferencesModel preferences = const DiningPreferencesModel();
  bool isLoadingPreferences = false;
  bool isSavingProfile = false;
  bool isSavingPreferences = false;
  String? error;

  Future<void> loadPreferences() async {
    isLoadingPreferences = true;
    error = null;
    notifyListeners();
    try {
      preferences = await _repository.getPreferences();
    } catch (e) {
      error = e.toString();
    } finally {
      isLoadingPreferences = false;
      notifyListeners();
    }
  }

  Future<UserModel> saveProfile({String? name, String? phone}) async {
    isSavingProfile = true;
    notifyListeners();
    try {
      return await _repository.updateProfile(name: name, phone: phone);
    } finally {
      isSavingProfile = false;
      notifyListeners();
    }
  }

  Future<bool> savePreferences(DiningPreferencesModel next) async {
    isSavingPreferences = true;
    notifyListeners();
    try {
      preferences = await _repository.updatePreferences(next);
      return true;
    } catch (_) {
      return false;
    } finally {
      isSavingPreferences = false;
      notifyListeners();
    }
  }
}
