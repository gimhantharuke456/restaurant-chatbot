import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

/// Shared icon + heading + subtext layout for "nothing here" states, with
/// an optional trailing [child] slot (e.g. chat's suggested prompts).
class EmptyStateView extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Widget? child;

  const EmptyStateView({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(color: AppColors.muted, borderRadius: BorderRadius.circular(16)),
              child: Icon(icon, color: AppColors.mutedForeground, size: 28),
            ),
            const SizedBox(height: 16),
            Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
            const SizedBox(height: 4),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.mutedForeground, fontSize: 13),
            ),
            if (child != null) ...[
              const SizedBox(height: 20),
              child!,
            ],
          ],
        ),
      ),
    );
  }
}
