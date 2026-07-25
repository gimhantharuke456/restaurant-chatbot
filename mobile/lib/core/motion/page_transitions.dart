import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'app_motion.dart';

/// A fade + slight upward slide, used for every GoRoute in app_router.dart
/// so route changes have one consistent, intentional transition instead of
/// the platform default.
CustomTransitionPage<void> buildPageTransition({
  required GoRouterState state,
  required Widget child,
}) {
  return CustomTransitionPage<void>(
    key: state.pageKey,
    child: child,
    transitionDuration: AppMotion.standard,
    reverseTransitionDuration: AppMotion.standard,
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      final curved = CurvedAnimation(parent: animation, curve: AppMotion.standardCurve);
      return FadeTransition(
        opacity: curved,
        child: SlideTransition(
          position: Tween<Offset>(begin: const Offset(0, 0.04), end: Offset.zero)
              .animate(curved),
          child: child,
        ),
      );
    },
  );
}
