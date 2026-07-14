import 'package:firebase_core/firebase_core.dart';

/// Placeholder Firebase project configuration.
///
/// Replace these values with a real project's config (e.g. via
/// `flutterfire configure`) once one is provisioned. Firebase.initializeApp()
/// succeeds locally with these values, but any call that reaches Firebase's
/// servers (sign-in, sign-up) will fail — expected until real credentials
/// are swapped in.
class DummyFirebaseOptions {
  DummyFirebaseOptions._();

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'dummy-api-key',
    appId: '1:000000000000:android:0000000000000000000000',
    messagingSenderId: '000000000000',
    projectId: 'restaurant-chatbot-dummy',
    storageBucket: 'restaurant-chatbot-dummy.appspot.com',
  );
}
