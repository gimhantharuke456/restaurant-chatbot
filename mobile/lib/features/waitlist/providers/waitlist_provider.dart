import 'package:flutter/foundation.dart';
import '../data/waitlist_repository.dart';
import '../models/waitlist_entry_model.dart';

class WaitlistProvider extends ChangeNotifier {
  final WaitlistRepository _repository;

  WaitlistProvider(this._repository);

  List<WaitlistEntryModel> entries = [];
  bool isLoading = false;
  String? error;
  bool isJoining = false;

  Future<void> fetch() async {
    isLoading = true;
    error = null;
    notifyListeners();
    try {
      entries = await _repository.getMyWaitlist();
    } catch (e) {
      error = e.toString();
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<WaitlistEntryModel?> join({
    required String restaurantId,
    required DateTime date,
    required String time,
    required int partySize,
  }) async {
    isJoining = true;
    notifyListeners();
    try {
      final entry = await _repository.joinWaitlist(
        restaurantId: restaurantId,
        date: date,
        time: time,
        partySize: partySize,
      );
      entries = [entry, ...entries];
      return entry;
    } finally {
      isJoining = false;
      notifyListeners();
    }
  }

  Future<void> leave(String id) async {
    final previous = entries;
    entries = entries.where((e) => e.id != id).toList();
    notifyListeners();
    try {
      await _repository.leaveWaitlist(id);
    } catch (e) {
      entries = previous;
      error = e.toString();
      notifyListeners();
    }
  }
}
