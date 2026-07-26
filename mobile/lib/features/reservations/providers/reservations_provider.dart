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
        .map((r) => r.id == id ? r.copyWith(status: 'CANCELLED') : r)
        .toList();
    notifyListeners();
  }

  Future<void> submitReview(String reservationId, {required int rating, String? comment}) async {
    final existing = reservations.firstWhere((r) => r.id == reservationId);
    await _repository.submitReview(
      reservationId: reservationId,
      rating: rating,
      comment: comment,
      isUpdate: existing.hasReview,
    );
    reservations = reservations
        .map((r) => r.id == reservationId
            ? r.copyWith(reviewRating: rating, reviewComment: comment)
            : r)
        .toList();
    notifyListeners();
  }
}
