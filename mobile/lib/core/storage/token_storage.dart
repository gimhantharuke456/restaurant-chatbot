import 'package:flutter_secure_storage/flutter_secure_storage.dart';

abstract class TokenStorage {
  Future<void> save(String token);
  Future<String?> read();
  Future<void> clear();
}

class SecureTokenStorage implements TokenStorage {
  static const _tokenKey = 'auth_token';

  final FlutterSecureStorage _storage;

  SecureTokenStorage({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  @override
  Future<void> save(String token) => _storage.write(key: _tokenKey, value: token);

  @override
  Future<String?> read() => _storage.read(key: _tokenKey);

  @override
  Future<void> clear() => _storage.delete(key: _tokenKey);
}
