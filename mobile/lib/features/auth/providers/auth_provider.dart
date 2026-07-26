import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart' as gsi;
import '../../../core/network/auth_token_holder.dart';
import '../../../core/storage/token_storage.dart';
import '../data/auth_repository.dart';
import '../models/user_model.dart';

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthProvider extends ChangeNotifier {
  final AuthRepository _repository;
  final TokenStorage _tokenStorage;
  final AuthTokenHolder _tokenHolder;
  StreamSubscription<String?>? _tokenSubscription;

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
    // Firebase's SDK already persists the signed-in credential natively, so
    // ask it for a fresh token rather than trusting whatever was last cached
    // — a cached token can be hours stale and Firebase ID tokens expire
    // after ~1 hour.
    final token = await _repository.refreshToken();
    if (token == null) {
      await _tokenStorage.clear();
      _tokenHolder.token = null;
      status = AuthStatus.unauthenticated;
      notifyListeners();
      return;
    }
    await _tokenStorage.save(token);
    _tokenHolder.token = token;
    try {
      currentUser = await _repository.fetchCurrentUser();
      status = AuthStatus.authenticated;
      _listenForTokenRefresh();
    } catch (_) {
      await _tokenStorage.clear();
      _tokenHolder.token = null;
      status = AuthStatus.unauthenticated;
    }
    notifyListeners();
  }

  void _listenForTokenRefresh() {
    _tokenSubscription?.cancel();
    _tokenSubscription = _repository.idTokenChanges().listen((token) async {
      if (token == null) return; // explicit signOut() handles the logout path
      _tokenHolder.token = token;
      await _tokenStorage.save(token);
    });
  }

  Future<bool> signIn(String email, String password) {
    return _runAuthAction(() => _repository.signInWithEmail(email, password));
  }

  Future<bool> register(String email, String password, String name) {
    return _runAuthAction(() => _repository.registerWithEmail(email, password, name));
  }

  Future<bool> signInWithGoogle() async {
    isLoading = true;
    error = null;
    notifyListeners();
    try {
      final token = await _repository.signInWithGoogle();
      await _tokenStorage.save(token);
      _tokenHolder.token = token;
      currentUser = await _repository.fetchCurrentUser();
      status = AuthStatus.authenticated;
      _listenForTokenRefresh();
      return true;
    } on gsi.GoogleSignInException catch (e) {
      // A user-initiated cancel isn't an error worth surfacing.
      if (e.code != gsi.GoogleSignInExceptionCode.canceled) {
        error = 'Google sign-in failed';
      }
      status = AuthStatus.unauthenticated;
      return false;
    } catch (e) {
      error = e.toString();
      status = AuthStatus.unauthenticated;
      return false;
    } finally {
      isLoading = false;
      notifyListeners();
    }
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
      _listenForTokenRefresh();
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

  void updateLocalUser(UserModel user) {
    currentUser = user;
    notifyListeners();
  }

  Future<void> signOut() async {
    await _tokenSubscription?.cancel();
    _tokenSubscription = null;
    await _repository.signOut();
    await _tokenStorage.clear();
    _tokenHolder.token = null;
    currentUser = null;
    status = AuthStatus.unauthenticated;
    notifyListeners();
  }

  @override
  void dispose() {
    _tokenSubscription?.cancel();
    super.dispose();
  }
}
