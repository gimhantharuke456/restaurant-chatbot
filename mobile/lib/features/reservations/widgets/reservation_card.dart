import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../models/my_reservation_model.dart';

const _statusColors = {
  'PENDING': AppColors.primary,
  'CONFIRMED': Colors.green,
  'CANCELLED': AppColors.destructive,
  'COMPLETED': Colors.blue,
  'NO_SHOW': AppColors.mutedForeground,
};

class ReservationCard extends StatelessWidget {
  final MyReservationModel reservation;
  final Future<void> Function()? onCancel;

  const ReservationCard({super.key, required this.reservation, this.onCancel});

  @override
  Widget build(BuildContext context) {
    final statusColor = _statusColors[reservation.status] ?? AppColors.mutedForeground;
    final dateLabel =
        '${reservation.date.year}-${reservation.date.month.toString().padLeft(2, '0')}-${reservation.date.day.toString().padLeft(2, '0')}';

    return Card(
      color: AppColors.card,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(reservation.restaurantName,
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                      if (reservation.restaurantArea.isNotEmpty)
                        Text(reservation.restaurantArea,
                            style: const TextStyle(color: AppColors.mutedForeground, fontSize: 12)),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    reservation.status,
                    style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 12,
              runSpacing: 4,
              children: [
                _InfoChip(icon: Icons.calendar_today, label: dateLabel),
                _InfoChip(icon: Icons.access_time, label: reservation.time),
                _InfoChip(
                  icon: Icons.people_outline,
                  label: '${reservation.partySize} ${reservation.partySize == 1 ? 'person' : 'people'}',
                ),
              ],
            ),
            if (reservation.preOrderItemCount != null && reservation.preOrderItemCount! > 0) ...[
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '${reservation.preOrderItemCount} item${reservation.preOrderItemCount == 1 ? '' : 's'} pre-ordered',
                    style: const TextStyle(color: AppColors.mutedForeground, fontSize: 12),
                  ),
                  Text(
                    'LKR ${reservation.preOrderAmount?.toStringAsFixed(0) ?? '0'}',
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
                  ),
                ],
              ),
            ],
            if (reservation.canCancel && onCancel != null) ...[
              const SizedBox(height: 10),
              Align(
                alignment: Alignment.centerLeft,
                child: OutlinedButton.icon(
                  onPressed: onCancel,
                  style: OutlinedButton.styleFrom(foregroundColor: AppColors.destructive),
                  icon: const Icon(Icons.close, size: 16),
                  label: const Text('Cancel reservation'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;

  const _InfoChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 13, color: AppColors.mutedForeground),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(color: AppColors.mutedForeground, fontSize: 12)),
      ],
    );
  }
}
