import 'package:flutter/foundation.dart';
import '../../../core/network/auth_token_holder.dart';
import '../../../core/storage/token_storage.dart';
import '../data/auth_repository.dart';
import '../models/user_model.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthProvider extends ChangeNotifier {
  final AuthRepository _repository;
  final TokenStorage _tokenStorage;
  final AuthTokenHolder _tokenHolder;

  AuthProvider({
    required AuthRepository repository,
    required TokenStorage tokenStorage,
    required AuthTokenHolder tokenHolder,
  })  : _repository = repository,
        _tokenStorage = tokenStorage,
        _tokenHolder = tokenHolder;

  AuthStatus status = AuthStatus.unknown;
  UserModel? currentUser;
  String? error;
  bool isLoading = false;

  Future<void> restoreSession() async {
    final token = await _tokenStorage.read();
    if (token == null) {
      status = AuthStatus.unauthenticated;
      notifyListeners();
      return;
    }
    _tokenHolder.token = token;
    try {
      currentUser = await _repository.fetchCurrentUser();
      status = AuthStatus.authenticated;
    } catch (_) {
      await _tokenStorage.clear();
      _tokenHolder.token = null;
      status = AuthStatus.unauthenticated;
    }
    notifyListeners();
  }

  Future<bool> signIn(String email, String password) {
    return _runAuthAction(() => _repository.signInWithEmail(email, password));
  }

  Future<bool> register(String email, String password, String name) {
    return _runAuthAction(() => _repository.registerWithEmail(email, password, name));
  }

  Future<bool> _runAuthAction(Future<String> Function() action) async {
    isLoading = true;
    error = null;
    notifyListeners();
    try {
      final token = await action();
      await _tokenStorage.save(token);
      _tokenHolder.token = token;
      currentUser = await _repository.fetchCurrentUser();
      status = AuthStatus.authenticated;
      return true;
    } catch (e) {
      error = e.toString();
      status = AuthStatus.unauthenticated;
      return false;
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<void> signOut() async {
    await _repository.signOut();
    await _tokenStorage.clear();
    _tokenHolder.token = null;
    currentUser = null;
    status = AuthStatus.unauthenticated;
    notifyListeners();
  }
}
