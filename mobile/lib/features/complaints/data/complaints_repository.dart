import '../../../core/network/api_client.dart';
import '../models/complaint_model.dart';

abstract class ComplaintsRepository {
  Future<List<ComplaintModel>> getMyComplaints();
  Future<ComplaintModel> createComplaint({required String subject, required String description});
}

class ApiComplaintsRepository implements ComplaintsRepository {
  final ApiClient _apiClient;

  ApiComplaintsRepository(this._apiClient);

  @override
  Future<List<ComplaintModel>> getMyComplaints() async {
    final json = await _apiClient.get('/users/me/complaints');
    if (json is! List) return [];
    return json.whereType<Map<String, dynamic>>().map(ComplaintModel.fromJson).toList();
  }

  @override
  Future<ComplaintModel> createComplaint({required String subject, required String description}) async {
    final json = await _apiClient.post('/users/me/complaints', body: {
      'subject': subject,
      'description': description,
    }) as Map<String, dynamic>;
    return ComplaintModel.fromJson(json);
  }
}
