import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import '../../core/motion/skeleton_loader.dart';
import '../../core/theme/app_colors.dart';

/// A disk/memory-cached network image (via `cached_network_image`) with a
/// shimmer placeholder while loading and a fallback icon on error or when
/// [url] is null/empty. Use for every restaurant/menu-item photo so repeat
/// views (list scroll-back, revisits) don't re-download the same image.
class AppNetworkImage extends StatelessWidget {
  final String? url;
  final double height;
  final double width;
  final BoxFit fit;
  final BorderRadius borderRadius;
  final IconData fallbackIcon;

  const AppNetworkImage({
    super.key,
    required this.url,
    required this.height,
    this.width = double.infinity,
    this.fit = BoxFit.cover,
    this.borderRadius = BorderRadius.zero,
    this.fallbackIcon = Icons.restaurant,
  });

  @override
  Widget build(BuildContext context) {
    final hasUrl = url != null && url!.isNotEmpty;
    return ClipRRect(
      borderRadius: borderRadius,
      child: hasUrl
          ? CachedNetworkImage(
              imageUrl: url!,
              width: width,
              height: height,
              fit: fit,
              placeholder: (context, _) => SkeletonLoader(width: width, height: height, borderRadius: borderRadius),
              errorWidget: (context, _, _) => _fallback(),
            )
          : _fallback(),
    );
  }

  Widget _fallback() {
    return Container(
      width: width,
      height: height,
      color: AppColors.secondary,
      child: Icon(fallbackIcon, color: AppColors.mutedForeground),
    );
  }
}
