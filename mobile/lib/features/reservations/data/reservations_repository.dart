import '../../../core/network/api_client.dart';
import '../models/my_reservation_model.dart';

abstract class ReservationsRepository {
  Future<List<MyReservationModel>> getUserReservations();
  Future<void> cancelReservation(String id);
  Future<void> submitReview({
    required String reservationId,
    required int rating,
    String? comment,
    List<String> imageUrls,
    required bool isUpdate,
  });
  Future<String?> uploadReviewImage(List<int> bytes, String filename);
}

class ApiReservationsRepository implements ReservationsRepository {
  final ApiClient _apiClient;

  ApiReservationsRepository(this._apiClient);

  @override
  Future<List<MyReservationModel>> getUserReservations() async {
    final json = await _apiClient.get('/reservations');
    if (json is! List) return [];
    return json
        .whereType<Map<String, dynamic>>()
        .map(MyReservationModel.fromJson)
        .toList();
  }

  @override
  Future<void> cancelReservation(String id) async {
    await _apiClient.delete('/reservations/$id');
  }

  @override
  Future<void> submitReview({
    required String reservationId,
    required int rating,
    String? comment,
    List<String> imageUrls = const [],
    required bool isUpdate,
  }) async {
    final body = {
      'rating': rating,
      if (comment != null && comment.isNotEmpty) 'comment': comment,
      'imageUrls': imageUrls,
    };
    if (isUpdate) {
      await _apiClient.put('/reservations/$reservationId/review', body: body);
    } else {
      await _apiClient.post('/reservations/$reservationId/review', body: body);
    }
  }

  @override
  Future<String?> uploadReviewImage(List<int> bytes, String filename) async {
    final result = await _apiClient.uploadFile(
      '/upload',
      bytes: bytes,
      filename: filename,
      folder: 'reviews',
    );
    return (result as Map<String, dynamic>?)?['fileUrl'] as String?;
  }
}
