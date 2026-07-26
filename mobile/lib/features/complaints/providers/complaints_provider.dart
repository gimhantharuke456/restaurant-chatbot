import 'package:flutter/foundation.dart';
import '../data/complaints_repository.dart';
import '../models/complaint_model.dart';

class ComplaintsProvider extends ChangeNotifier {
  final ComplaintsRepository _repository;

  ComplaintsProvider(this._repository);

  List<ComplaintModel> complaints = [];
  bool isLoading = false;
  String? error;
  bool isSubmitting = false;

  Future<void> fetch() async {
    isLoading = true;
    error = null;
    notifyListeners();
    try {
      complaints = await _repository.getMyComplaints();
    } catch (e) {
      error = e.toString();
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> submit({required String subject, required String description}) async {
    isSubmitting = true;
    notifyListeners();
    try {
      final created = await _repository.createComplaint(subject: subject, description: description);
      complaints = [created, ...complaints];
      return true;
    } catch (_) {
      return false;
    } finally {
      isSubmitting = false;
      notifyListeners();
    }
  }
}
