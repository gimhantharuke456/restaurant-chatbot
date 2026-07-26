import '../../../core/network/api_client.dart';
import '../models/waitlist_entry_model.dart';

abstract class WaitlistRepository {
  Future<List<WaitlistEntryModel>> getMyWaitlist();
  Future<WaitlistEntryModel> joinWaitlist({
    required String restaurantId,
    required DateTime date,
    required String time,
    required int partySize,
  });
  Future<void> leaveWaitlist(String id);
}

class ApiWaitlistRepository implements WaitlistRepository {
  final ApiClient _apiClient;

  ApiWaitlistRepository(this._apiClient);

  @override
  Future<List<WaitlistEntryModel>> getMyWaitlist() async {
    final json = await _apiClient.get('/waitlist');
    if (json is! List) return [];
    return json.whereType<Map<String, dynamic>>().map(WaitlistEntryModel.fromJson).toList();
  }

  @override
  Future<WaitlistEntryModel> joinWaitlist({
    required String restaurantId,
    required DateTime date,
    required String time,
    required int partySize,
  }) async {
    final json = await _apiClient.post('/waitlist', body: {
      'restaurantId': restaurantId,
      'date': date.toIso8601String().split('T').first,
      'time': time,
      'partySize': partySize,
    }) as Map<String, dynamic>;
    return WaitlistEntryModel.fromJson(json);
  }

  @override
  Future<void> leaveWaitlist(String id) async {
    await _apiClient.delete('/waitlist/$id');
  }
}
