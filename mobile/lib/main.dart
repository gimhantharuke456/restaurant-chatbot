import 'package:flutter/material.dart';
import 'core/theme/app_theme.dart';

void main() {
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
