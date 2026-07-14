import 'package:firebase_auth/firebase_auth.dart' as fb;
import '../../../core/network/api_client.dart';
import '../models/user_model.dart';

abstract class AuthRepository {
  Future<String> signInWithEmail(String email, String password);
  Future<String> registerWithEmail(String email, String password, String name);
  Future<void> signOut();
  Future<UserModel> fetchCurrentUser();
}

class FirebaseAuthRepository implements AuthRepository {
  final fb.FirebaseAuth _firebaseAuth;
  final ApiClient _apiClient;

  FirebaseAuthRepository({
    required ApiClient apiClient,
    fb.FirebaseAuth? firebaseAuth,
  })  : _apiClient = apiClient,
        _firebaseAuth = firebaseAuth ?? fb.FirebaseAuth.instance;

  @override
  Future<String> signInWithEmail(String email, String password) async {
    final credential = await _firebaseAuth.signInWithEmailAndPassword(
      email: email,
      password: password,
    );
    final token = await credential.user!.getIdToken();
    return token!;
  }

  @override
  Future<String> registerWithEmail(String email, String password, String name) async {
    final credential = await _firebaseAuth.createUserWithEmailAndPassword(
      email: email,
      password: password,
    );
    final token = await credential.user!.getIdToken();
    await _apiClient.post('/auth/register', body: {
      'firebaseUid': credential.user!.uid,
      'email': email,
      'name': name,
    });
    return token!;
  }

  @override
  Future<void> signOut() => _firebaseAuth.signOut();

  @override
  Future<UserModel> fetchCurrentUser() async {
    final json = await _apiClient.get('/auth/me') as Map<String, dynamic>;
    return UserModel.fromJson(json);
  }
}
