import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:provider/provider.dart';
import 'core/firebase/google_signin_config.dart';
import 'core/network/api_client.dart';
import 'core/payments/stripe_config.dart';
import 'firebase_options.dart';
import 'core/network/auth_token_holder.dart';
import 'core/router/app_router.dart';
import 'core/storage/token_storage.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/data/auth_repository.dart';
import 'features/auth/providers/auth_provider.dart';
import 'features/booking/data/booking_repository.dart';
import 'features/chat/data/chat_repository.dart';
import 'features/chat/providers/chat_provider.dart';
import 'features/restaurants/data/restaurant_repository.dart';
import 'features/restaurants/providers/restaurant_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  await GoogleSignIn.instance.initialize(
    serverClientId: GoogleSignInConfig.serverClientId,
  );
  Stripe.publishableKey = StripeConfig.publishableKey;
  await Stripe.instance.applySettings();
  runApp(const RestaurantChatbotApp());
}

class RestaurantChatbotApp extends StatelessWidget {
  const RestaurantChatbotApp({super.key});

  @override
  Widget build(BuildContext context) {
    final tokenHolder = AuthTokenHolder();
    final tokenStorage = SecureTokenStorage();
    final apiClient = ApiClient(tokenProvider: () => tokenHolder.token);
    final restaurantRepository = ApiRestaurantRepository(apiClient);
    final chatRepository = ApiChatRepository(apiClient);
    final bookingRepository = ApiBookingRepository(apiClient);
    final authProvider = AuthProvider(
      repository: FirebaseAuthRepository(apiClient: apiClient),
      tokenStorage: tokenStorage,
      tokenHolder: tokenHolder,
    )..restoreSession();
    apiClient.onUnauthorized = authProvider.signOut;
    final router = buildAppRouter(authProvider);

    return MultiProvider(
      providers: [
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
      ],
      child: MaterialApp.router(
        title: 'Restaurant Chatbot',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.dark,
        routerConfig: router,
      ),
    );
  }
}
