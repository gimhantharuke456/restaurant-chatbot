import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/register_screen.dart';
import '../../features/booking/screens/booking_flow_screen.dart';
import '../../features/chat/screens/chat_screen.dart';
import '../../features/restaurants/data/restaurant_repository.dart';
import '../../features/restaurants/providers/restaurant_detail_provider.dart';
import '../../features/restaurants/screens/home_screen.dart';
import '../../features/restaurants/screens/restaurant_detail_screen.dart';
import '../../shared/widgets/app_shell.dart';
import '../../shared/widgets/coming_soon_screen.dart';

GoRouter buildAppRouter(AuthProvider authProvider) {
  return GoRouter(
    initialLocation: '/home',
    refreshListenable: authProvider,
    redirect: (context, state) {
      if (authProvider.status == AuthStatus.unknown) return null;

      final loggedIn = authProvider.status == AuthStatus.authenticated;
      final loggingIn = state.matchedLocation == '/login' || state.matchedLocation == '/register';

      if (!loggedIn && !loggingIn) return '/login';
      if (loggedIn && loggingIn) return '/home';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(path: '/register', builder: (context, state) => const RegisterScreen()),
      ShellRoute(
        builder: (context, state, child) => AppShell(location: state.matchedLocation, child: child),
        routes: [
          GoRoute(path: '/home', builder: (context, state) => const HomeScreen()),
          GoRoute(
            path: '/reservations',
            builder: (context, state) => const ComingSoonScreen(title: 'Reservations'),
          ),
          GoRoute(
            path: '/chat',
            builder: (context, state) => const ChatScreen(),
          ),
          GoRoute(
            path: '/more',
            builder: (context, state) => const ComingSoonScreen(title: 'More'),
          ),
        ],
      ),
      GoRoute(
        path: '/restaurants/:id',
        builder: (context, state) => ChangeNotifierProvider(
          create: (_) => RestaurantDetailProvider(context.read<RestaurantRepository>()),
          child: RestaurantDetailScreen(restaurantId: state.pathParameters['id']!),
        ),
      ),
      GoRoute(
        path: '/restaurants/:id/book',
        builder: (context, state) => BookingFlowScreen(restaurantId: state.pathParameters['id']!),
      ),
    ],
  );
}
