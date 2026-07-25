import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'app_motion.dart';

/// Wraps [child] with a fade+slide entrance, staggered by [index] so list
/// items cascade in rather than appearing simultaneously. Delay is capped
/// at 8 items so long lists don't take forever to finish appearing.
Widget staggeredEntrance(Widget child, {int index = 0}) {
  final delay = AppMotion.fast * index.clamp(0, 8);
  return child
      .animate(delay: delay)
      .fadeIn(duration: AppMotion.standard, curve: AppMotion.standardCurve)
      .slideY(
        begin: 0.06,
        end: 0,
        duration: AppMotion.standard,
        curve: AppMotion.standardCurve,
      );
}
