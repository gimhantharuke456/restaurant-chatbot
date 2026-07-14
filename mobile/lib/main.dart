import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'core/firebase/firebase_options_dummy.dart';
import 'core/theme/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DummyFirebaseOptions.android);
  runApp(const RestaurantChatbotApp());
}

class RestaurantChatbotApp extends StatelessWidget {
  const RestaurantChatbotApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Restaurant Chatbot',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.dark,
      home: const Scaffold(
        body: Center(child: Text('Restaurant Chatbot')),
      ),
    );
  }
}
