import '../../../core/network/api_client.dart';
import '../models/payment_history_model.dart';

abstract class PaymentHistoryRepository {
  Future<List<PaymentHistoryModel>> getHistory();
}

class ApiPaymentHistoryRepository implements PaymentHistoryRepository {
  final ApiClient _apiClient;

  ApiPaymentHistoryRepository(this._apiClient);

  @override
  Future<List<PaymentHistoryModel>> getHistory() async {
    final json = await _apiClient.get('/payments/history');
    if (json is! List) return [];
    return json.whereType<Map<String, dynamic>>().map(PaymentHistoryModel.fromJson).toList();
  }
}
