import 'package:flutter/animation.dart';

/// Single source of truth for animation timing across the app — every
/// screen references these instead of hardcoding its own durations/curves.
class AppMotion {
  AppMotion._();

  static const fast = Duration(milliseconds: 150);
  static const standard = Duration(milliseconds: 250);
  static const emphasized = Duration(milliseconds: 400);

  static const standardCurve = Curves.easeOutCubic;
  static const emphasizedCurve = Curves.easeOutCubic;
}
