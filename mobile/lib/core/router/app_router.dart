import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/register_screen.dart';
import '../../features/booking/screens/booking_flow_screen.dart';
import '../../features/chat/screens/chat_screen.dart';
import '../../features/complaints/screens/complaints_screen.dart';
import '../../features/favorites/screens/favorites_screen.dart';
import '../../features/loyalty/screens/loyalty_screen.dart';
import '../../features/notifications/screens/notifications_screen.dart';
import '../../features/profile/screens/profile_screen.dart';
import '../../features/reservations/screens/reservations_screen.dart';
import '../../features/waitlist/screens/waitlist_screen.dart';
import '../../features/restaurants/data/restaurant_repository.dart';
import '../../features/restaurants/providers/restaurant_detail_provider.dart';
import '../../features/restaurants/screens/home_screen.dart';
import '../../features/restaurants/screens/restaurant_detail_screen.dart';
import '../../shared/widgets/app_shell.dart';
import '../../shared/widgets/more_menu_screen.dart';
import '../motion/page_transitions.dart';

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
      GoRoute(
        path: '/login',
        pageBuilder: (context, state) => buildPageTransition(state: state, child: const LoginScreen()),
      ),
      GoRoute(
        path: '/register',
        pageBuilder: (context, state) => buildPageTransition(state: state, child: const RegisterScreen()),
      ),
      ShellRoute(
        builder: (context, state, child) => AppShell(location: state.matchedLocation, child: child),
        routes: [
          GoRoute(
            path: '/home',
            pageBuilder: (context, state) => buildPageTransition(state: state, child: const HomeScreen()),
          ),
          GoRoute(
            path: '/reservations',
            pageBuilder: (context, state) =>
                buildPageTransition(state: state, child: const ReservationsScreen()),
          ),
          GoRoute(
            path: '/chat',
            pageBuilder: (context, state) => buildPageTransition(state: state, child: const ChatScreen()),
          ),
          GoRoute(
            path: '/more',
            pageBuilder: (context, state) =>
                buildPageTransition(state: state, child: const MoreMenuScreen()),
          ),
        ],
      ),
      GoRoute(
        path: '/restaurants/:id',
        pageBuilder: (context, state) => buildPageTransition(
          state: state,
          child: ChangeNotifierProvider(
            create: (_) => RestaurantDetailProvider(context.read<RestaurantRepository>()),
            child: RestaurantDetailScreen(restaurantId: state.pathParameters['id']!),
          ),
        ),
      ),
      GoRoute(
        path: '/restaurants/:id/book',
        pageBuilder: (context, state) => buildPageTransition(
          state: state,
          child: BookingFlowScreen(restaurantId: state.pathParameters['id']!),
        ),
      ),
      GoRoute(
        path: '/favorites',
        pageBuilder: (context, state) => buildPageTransition(state: state, child: const FavoritesScreen()),
      ),
      GoRoute(
        path: '/loyalty',
        pageBuilder: (context, state) => buildPageTransition(state: state, child: const LoyaltyScreen()),
      ),
      GoRoute(
        path: '/complaints',
        pageBuilder: (context, state) => buildPageTransition(state: state, child: const ComplaintsScreen()),
      ),
      GoRoute(
        path: '/waitlist',
        pageBuilder: (context, state) => buildPageTransition(state: state, child: const WaitlistScreen()),
      ),
      GoRoute(
        path: '/notifications',
        pageBuilder: (context, state) =>
            buildPageTransition(state: state, child: const NotificationsScreen()),
      ),
      GoRoute(
        path: '/profile',
        pageBuilder: (context, state) => buildPageTransition(state: state, child: const ProfileScreen()),
      ),
    ],
  );
}
