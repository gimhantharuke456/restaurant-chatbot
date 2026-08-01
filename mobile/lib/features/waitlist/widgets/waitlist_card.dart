import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../models/waitlist_entry_model.dart';

const _statusLabels = {
  'WAITING': 'Waiting',
  'NOTIFIED': 'Table Available!',
  'EXPIRED': 'Expired',
  'BOOKED': 'Booked',
};

class WaitlistCard extends StatelessWidget {
  final WaitlistEntryModel entry;
  final VoidCallback? onLeave;
  final VoidCallback? onBookNow;

  const WaitlistCard({super.key, required this.entry, this.onLeave, this.onBookNow});

  @override
  Widget build(BuildContext context) {
    final mutedColor = Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.55);
    final statusColors = {
      'WAITING': mutedColor,
      'NOTIFIED': AppColors.primary,
      'EXPIRED': mutedColor,
      'BOOKED': Colors.green,
    };
    final statusColor = statusColors[entry.status] ?? mutedColor;
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(entry.restaurantName,
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    _statusLabels[entry.status] ?? entry.status,
                    style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              '${entry.date.day}/${entry.date.month}/${entry.date.year} at ${entry.time} '
              '· ${entry.partySize} ${entry.partySize == 1 ? 'person' : 'people'}',
              style: TextStyle(color: mutedColor, fontSize: 13),
            ),
            if (entry.status == 'WAITING') ...[
              const SizedBox(height: 6),
              Text('Queue position: #${entry.position}',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
            ],
            if (entry.status == 'NOTIFIED') ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('A table is available! Book now before the slot fills up.',
                        style: TextStyle(fontSize: 12, color: AppColors.primary)),
                    if (onBookNow != null) ...[
                      const SizedBox(height: 6),
                      TextButton(onPressed: onBookNow, child: const Text('Book via AI Chat')),
                    ],
                  ],
                ),
              ),
            ],
            if (entry.canLeave && onLeave != null) ...[
              const SizedBox(height: 8),
              TextButton.icon(
                onPressed: onLeave,
                icon: const Icon(Icons.close, size: 14),
                label: const Text('Leave waitlist'),
                style: TextButton.styleFrom(
                  foregroundColor: mutedColor,
                  padding: EdgeInsets.zero,
                  minimumSize: const Size(0, 0),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
