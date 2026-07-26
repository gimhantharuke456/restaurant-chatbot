import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:provider/provider.dart';
import 'core/firebase/google_signin_config.dart';
import 'core/local_notifications/local_notifications_service.dart';
import 'core/network/api_client.dart';
import 'core/payments/stripe_config.dart';
import 'core/realtime/realtime_notifications_coordinator.dart';
import 'core/realtime/socket_service.dart';
import 'firebase_options.dart';
import 'core/network/auth_token_holder.dart';
import 'core/router/app_router.dart';
import 'core/storage/token_storage.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/theme_provider.dart';
import 'features/auth/data/auth_repository.dart';
import 'features/auth/providers/auth_provider.dart';
import 'features/booking/data/booking_repository.dart';
import 'features/chat/data/chat_repository.dart';
import 'features/complaints/data/complaints_repository.dart';
import 'features/complaints/providers/complaints_provider.dart';
import 'features/chat/providers/chat_provider.dart';
import 'features/favorites/data/favorites_repository.dart';
import 'features/favorites/providers/favorites_provider.dart';
import 'features/guest_chat/data/guest_chat_repository.dart';
import 'features/guest_chat/providers/guest_chat_provider.dart';
import 'features/loyalty/data/loyalty_repository.dart';
import 'features/loyalty/providers/loyalty_provider.dart';
import 'features/notifications/data/notifications_repository.dart';
import 'features/notifications/providers/notifications_provider.dart';
import 'features/profile/data/profile_repository.dart';
import 'features/profile/providers/profile_provider.dart';
import 'features/payment_history/data/payment_history_repository.dart';
import 'features/payment_history/providers/payment_history_provider.dart';
import 'features/promotions/data/promotions_repository.dart';
import 'features/promotions/providers/promotions_provider.dart';
import 'features/reservations/data/reservations_repository.dart';
import 'features/reservations/providers/reservations_provider.dart';
import 'features/restaurants/data/restaurant_repository.dart';
import 'features/restaurants/providers/restaurant_provider.dart';
import 'features/waitlist/data/waitlist_repository.dart';
import 'features/waitlist/providers/waitlist_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  await GoogleSignIn.instance.initialize(
    serverClientId: GoogleSignInConfig.serverClientId,
  );
  Stripe.publishableKey = StripeConfig.publishableKey;
  await Stripe.instance.applySettings();
  final localNotifications = LocalNotificationsService();
  await localNotifications.initialize();
  runApp(RestaurantChatbotApp(localNotifications: localNotifications));
}

class RestaurantChatbotApp extends StatelessWidget {
  final LocalNotificationsService localNotifications;

  const RestaurantChatbotApp({super.key, required this.localNotifications});

  @override
  Widget build(BuildContext context) {
    final tokenHolder = AuthTokenHolder();
    final tokenStorage = SecureTokenStorage();
    final apiClient = ApiClient(tokenProvider: () => tokenHolder.token);
    final restaurantRepository = ApiRestaurantRepository(apiClient);
    final chatRepository = ApiChatRepository(apiClient);
    final bookingRepository = ApiBookingRepository(apiClient);
    final reservationsRepository = ApiReservationsRepository(apiClient);
    final favoritesRepository = ApiFavoritesRepository(apiClient);
    final loyaltyRepository = ApiLoyaltyRepository(apiClient);
    final complaintsRepository = ApiComplaintsRepository(apiClient);
    final waitlistRepository = ApiWaitlistRepository(apiClient);
    final notificationsRepository = ApiNotificationsRepository(apiClient);
    final profileRepository = ApiProfileRepository(apiClient);
    final paymentHistoryRepository = ApiPaymentHistoryRepository(apiClient);
    final promotionsRepository = ApiPromotionsRepository(apiClient);
    final guestChatRepository = ApiGuestChatRepository(apiClient);
    final authRepository = FirebaseAuthRepository(apiClient: apiClient);
    final authProvider = AuthProvider(
      repository: authRepository,
      tokenStorage: tokenStorage,
      tokenHolder: tokenHolder,
    )..restoreSession();
    apiClient.onUnauthorized = authProvider.signOut;
    final router = buildAppRouter(authProvider);
    final notificationsProvider = NotificationsProvider(notificationsRepository);
    RealtimeNotificationsCoordinator(
      socketService: SocketService(),
      localNotifications: localNotifications,
      notificationsProvider: notificationsProvider,
      tokenChanges: authRepository.idTokenChanges(),
    );

    return MultiProvider(
      providers: [
        ChangeNotifierProvider<ThemeProvider>(create: (_) => ThemeProvider()),
        Provider<TokenStorage>.value(value: tokenStorage),
        Provider<ApiClient>.value(value: apiClient),
        Provider<RestaurantRepository>.value(value: restaurantRepository),
        ChangeNotifierProvider<AuthProvider>.value(value: authProvider),
        ChangeNotifierProvider<RestaurantProvider>(
          create: (context) => RestaurantProvider(context.read<RestaurantRepository>()),
        ),
        ChangeNotifierProvider<ChatProvider>(
          create: (_) => ChatProvider(chatRepository),
        ),
        Provider<BookingRepository>.value(value: bookingRepository),
        ChangeNotifierProvider<ReservationsProvider>(
          create: (_) => ReservationsProvider(reservationsRepository),
        ),
        Provider<FavoritesRepository>.value(value: favoritesRepository),
        ChangeNotifierProvider<FavoritesProvider>(
          create: (_) => FavoritesProvider(favoritesRepository),
        ),
        ChangeNotifierProvider<LoyaltyProvider>(
          create: (_) => LoyaltyProvider(loyaltyRepository),
        ),
        ChangeNotifierProvider<ComplaintsProvider>(
          create: (_) => ComplaintsProvider(complaintsRepository),
        ),
        ChangeNotifierProvider<WaitlistProvider>(
          create: (_) => WaitlistProvider(waitlistRepository),
        ),
        ChangeNotifierProvider<NotificationsProvider>.value(value: notificationsProvider),
        ChangeNotifierProvider<ProfileProvider>(
          create: (_) => ProfileProvider(profileRepository),
        ),
        ChangeNotifierProvider<PaymentHistoryProvider>(
          create: (_) => PaymentHistoryProvider(paymentHistoryRepository),
        ),
        ChangeNotifierProvider<PromotionsProvider>(
          create: (_) => PromotionsProvider(promotionsRepository),
        ),
        ChangeNotifierProvider<GuestChatProvider>(
          create: (_) => GuestChatProvider(guestChatRepository),
        ),
      ],
      builder: (context, child) {
        final themeProvider = context.watch<ThemeProvider>();
        return MaterialApp.router(
          title: 'Restaurant Chatbot',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.light,
          darkTheme: AppTheme.dark,
          themeMode: themeProvider.themeMode,
          routerConfig: router,
        );
      },
    );
  }
}
