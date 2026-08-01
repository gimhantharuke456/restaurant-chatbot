import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../models/notification_model.dart';

class NotificationTile extends StatelessWidget {
  final NotificationModel notification;
  final VoidCallback? onTap;

  const NotificationTile({super.key, required this.notification, this.onTap});

  @override
  Widget build(BuildContext context) {
    final isRead = notification.isRead;
    final mutedColor = Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.55);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isRead ? Theme.of(context).cardColor : AppColors.primary.withValues(alpha: 0.08),
          border: Border.all(color: isRead ? AppColors.border : AppColors.primary.withValues(alpha: 0.3)),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          notification.title,
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                        ),
                      ),
                      if (!isRead)
                        Container(
                          width: 6,
                          height: 6,
                          margin: const EdgeInsets.only(left: 6),
                          decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(notification.message, style: TextStyle(color: mutedColor, fontSize: 13)),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Text(
              '${notification.createdAt.day}/${notification.createdAt.month}',
              style: TextStyle(color: mutedColor, fontSize: 11),
            ),
          ],
        ),
      ),
    );
  }
}
