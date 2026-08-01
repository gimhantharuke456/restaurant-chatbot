import '../../../core/network/api_client.dart';
import '../models/cart_item_model.dart';
import '../models/reservation_model.dart';
import '../models/slot_model.dart';

class PaymentIntentResult {
  final String clientSecret;
  final String paymentId;
  final double amount;

  const PaymentIntentResult({
    required this.clientSecret,
    required this.paymentId,
    required this.amount,
  });
}

abstract class BookingRepository {
  Future<List<SlotModel>> getAvailability(String restaurantId, String date, {int partySize = 1});

  Future<ReservationModel> createReservation({
    required String restaurantId,
    required String date,
    required String time,
    required int partySize,
    String? specialRequests,
  });

  Future<PaymentIntentResult> createPaymentIntent({
    required String reservationId,
    required List<CartItemModel> orderItems,
  });
}

class ApiBookingRepository implements BookingRepository {
  final ApiClient _apiClient;

  ApiBookingRepository(this._apiClient);

  @override
  Future<List<SlotModel>> getAvailability(String restaurantId, String date, {int partySize = 1}) async {
    final json = await _apiClient.get(
      '/restaurants/$restaurantId/slot-capacity',
      query: {'date': date, 'partySize': partySize.toString()},
    );
    if (json is! List) return [];
    return json
        .whereType<Map<String, dynamic>>()
        .map(SlotModel.fromJson)
        .toList();
  }

  @override
  Future<ReservationModel> createReservation({
    required String restaurantId,
    required String date,
    required String time,
    required int partySize,
    String? specialRequests,
  }) async {
    final json = await _apiClient.post('/reservations', body: {
      'restaurantId': restaurantId,
      'date': date,
      'time': time,
      'partySize': partySize,
      if (specialRequests != null && specialRequests.isNotEmpty)
        'specialRequests': specialRequests,
    }) as Map<String, dynamic>;
    return ReservationModel.fromJson(json);
  }

  @override
  Future<PaymentIntentResult> createPaymentIntent({
    required String reservationId,
    required List<CartItemModel> orderItems,
  }) async {
    final json = await _apiClient.post('/payments/create-intent', body: {
      'reservationId': reservationId,
      'orderItems': orderItems.map((i) => i.toOrderItemJson()).toList(),
    }) as Map<String, dynamic>;
    return PaymentIntentResult(
      clientSecret: json['clientSecret'] as String,
      paymentId: json['paymentId'] as String,
      amount: (json['amount'] as num).toDouble(),
    );
  }
}
