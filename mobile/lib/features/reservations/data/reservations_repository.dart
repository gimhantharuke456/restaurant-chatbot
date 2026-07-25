import '../../../core/network/api_client.dart';
import '../models/my_reservation_model.dart';

abstract class ReservationsRepository {
  Future<List<MyReservationModel>> getUserReservations();
  Future<void> cancelReservation(String id);
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
}
