import 'package:flutter/foundation.dart';
import '../data/payment_history_repository.dart';
import '../models/payment_history_model.dart';

class PaymentHistoryProvider extends ChangeNotifier {
  final PaymentHistoryRepository _repository;

  PaymentHistoryProvider(this._repository);

  List<PaymentHistoryModel> payments = [];
  bool isLoading = false;
  String? error;

  Future<void> fetch() async {
    isLoading = true;
    error = null;
    notifyListeners();
    try {
      payments = await _repository.getHistory();
    } catch (e) {
      error = e.toString();
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }
}
