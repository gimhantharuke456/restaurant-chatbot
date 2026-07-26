import 'package:geolocator/geolocator.dart';

/// Reuses whatever location permission the user already granted elsewhere
/// (e.g. the home screen's "Near me" button) rather than prompting again
/// from inside chat — only resolves a position when permission is already
/// granted, so this never interrupts the conversation with a permission
/// dialog.
Future<({double lat, double lng})?> resolveLocation() async {
  try {
    final permission = await Geolocator.checkPermission();
    if (permission != LocationPermission.always && permission != LocationPermission.whileInUse) {
      return null;
    }
    if (!await Geolocator.isLocationServiceEnabled()) return null;

    final position = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(accuracy: LocationAccuracy.medium),
    );
    return (lat: position.latitude, lng: position.longitude);
  } catch (_) {
    return null;
  }
}
