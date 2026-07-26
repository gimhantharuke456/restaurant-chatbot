import 'package:flutter/foundation.dart';
import '../data/loyalty_repository.dart';
import '../models/loyalty_model.dart';

class LoyaltyProvider extends ChangeNotifier {
  final LoyaltyRepository _repository;

  LoyaltyProvider(this._repository);

  LoyaltyModel? account;
  List<LoyaltyTransactionModel> transactions = [];
  bool isLoading = false;
  String? error;

  Future<void> fetch() async {
    isLoading = true;
    error = null;
    notifyListeners();
    try {
      account = await _repository.getLoyalty();
      transactions = await _repository.getLoyaltyHistory();
    } catch (e) {
      error = e.toString();
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }
}
