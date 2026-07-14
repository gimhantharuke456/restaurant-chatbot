/// Mutable in-memory holder for the current auth token.
///
/// ApiClient needs the token synchronously on every request, but
/// TokenStorage reads are async. AuthProvider keeps this holder in sync
/// with whatever it just loaded/received, so ApiClient's tokenProvider
/// callback can read it without awaiting anything.
class AuthTokenHolder {
  String? token;
}
