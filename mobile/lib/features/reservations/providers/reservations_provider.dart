import 'package:flutter/foundation.dart';
import '../data/reservations_repository.dart';
import '../models/my_reservation_model.dart';

class ReservationsProvider extends ChangeNotifier {
  final ReservationsRepository _repository;

  ReservationsProvider(this._repository);

  List<MyReservationModel> reservations = [];
  bool isLoading = false;
  String? error;

  Future<void> fetch() async {
    isLoading = true;
    error = null;
    notifyListeners();
    try {
      reservations = await _repository.getUserReservations();
    } catch (e) {
      error = e.toString();
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<void> cancel(String id) async {
    await _repository.cancelReservation(id);
    reservations = reservations
        .map((r) => r.id == id
            ? MyReservationModel(
                id: r.id,
                restaurantId: r.restaurantId,
                restaurantName: r.restaurantName,
                restaurantArea: r.restaurantArea,
                date: r.date,
                time: r.time,
                partySize: r.partySize,
                status: 'CANCELLED',
                preOrderItemCount: r.preOrderItemCount,
                preOrderAmount: r.preOrderAmount,
              )
            : r)
        .toList();
    notifyListeners();
  }
}
