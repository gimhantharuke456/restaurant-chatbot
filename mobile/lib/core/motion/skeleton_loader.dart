import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

/// A shimmering placeholder box shown while content is loading. Shape it to
/// roughly match the content that's about to appear via [width]/[height]/
/// [borderRadius] at the call site.
class SkeletonLoader extends StatelessWidget {
  final double width;
  final double height;
  final BorderRadius borderRadius;

  const SkeletonLoader({
    super.key,
    this.width = double.infinity,
    required this.height,
    this.borderRadius = const BorderRadius.all(Radius.circular(8)),
  });

  @override
  Widget build(BuildContext context) {
    final secondary = Theme.of(context).colorScheme.secondary;
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(color: secondary, borderRadius: borderRadius),
    ).animate(onPlay: (controller) => controller.repeat()).shimmer(
          duration: const Duration(milliseconds: 1200),
          color: secondary.withValues(alpha: 0.4),
        );
  }
}
