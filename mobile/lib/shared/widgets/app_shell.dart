import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class AppShell extends StatelessWidget {
  final Widget child;
  final String location;

  const AppShell({super.key, required this.child, required this.location});

  static const _tabs = [
    ('/home', Icons.home_outlined, 'Home'),
    ('/reservations', Icons.calendar_today_outlined, 'Reservations'),
    ('/chat', Icons.chat_bubble_outline, 'Chat'),
    ('/more', Icons.menu, 'More'),
  ];

  int get _currentIndex {
    final index = _tabs.indexWhere((tab) => location.startsWith(tab.$1));
    return index == -1 ? 0 : index;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) => context.go(_tabs[index].$1),
        destinations: _tabs
            .map((tab) => NavigationDestination(icon: Icon(tab.$2), label: tab.$3))
            .toList(),
      ),
    );
  }
}
