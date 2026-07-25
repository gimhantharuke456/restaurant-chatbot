/// Stripe publishable key — safe to embed client-side (unlike the secret key).
/// Same test-mode key already used by backend/.env (STRIPE_PUBLIC_KEY) and
/// frontend/.env (NEXT_PUBLIC_STRIPE_PUBLIC_KEY).
class StripeConfig {
  StripeConfig._();

  static const String publishableKey =
      'pk_test_51Tb9sNKVKJmvD2D7TrDNBGE51vNzY48ZuubhutJ4yRtpU8xxMEB31os9AmEijSjapLijeB0paLsJGABmMfq30Ai200rboAnSiZ';
}
