import 'package:firebase_auth/firebase_auth.dart' as fb;
import 'package:google_sign_in/google_sign_in.dart' as gsi;
import '../../../core/network/api_client.dart';
import '../models/user_model.dart';

abstract class AuthRepository {
  Future<String> signInWithEmail(String email, String password);
  Future<String> registerWithEmail(String email, String password, String name);
  Future<String> signInWithGoogle();
  Future<void> signOut();
  Future<UserModel> fetchCurrentUser();

  /// Returns a fresh ID token from Firebase's own natively-persisted sign-in
  /// session (null if no one is signed in). Firebase ID tokens expire after
  /// ~1 hour, so this must be used instead of trusting a previously cached
  /// token string on app restart — same reasoning as the web frontend's
  /// `onAuthStateChanged` + `getIdToken()` refresh.
  Future<String?> refreshToken();

  /// Fires with a fresh token whenever Firebase refreshes it in the
  /// background (roughly every 55 minutes) or signs the user out (`null`),
  /// so a long-lived app session doesn't end up making API calls with a
  /// stale token.
  Stream<String?> idTokenChanges();
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
  Future<String> signInWithGoogle() async {
    final googleUser = await gsi.GoogleSignIn.instance.authenticate();
    final idToken = googleUser.authentication.idToken;
    final credential = fb.GoogleAuthProvider.credential(idToken: idToken);
    final userCredential = await _firebaseAuth.signInWithCredential(credential);
    final user = userCredential.user!;
    final token = await user.getIdToken();
    await _apiClient.post('/auth/register', body: {
      'firebaseUid': user.uid,
      'email': user.email,
      'name': user.displayName,
    });
    return token!;
  }

  @override
  Future<void> signOut() async {
    await gsi.GoogleSignIn.instance.signOut();
    await _firebaseAuth.signOut();
  }

  @override
  Future<UserModel> fetchCurrentUser() async {
    final json = await _apiClient.get('/auth/me') as Map<String, dynamic>;
    return UserModel.fromJson(json);
  }

  @override
  Future<String?> refreshToken() async {
    final user = _firebaseAuth.currentUser;
    if (user == null) return null;
    return user.getIdToken();
  }

  @override
  Stream<String?> idTokenChanges() {
    return _firebaseAuth.idTokenChanges().asyncMap((user) => user?.getIdToken());
  }
}
