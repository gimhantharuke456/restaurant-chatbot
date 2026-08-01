import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/theme/app_colors.dart';
import '../models/payment_history_model.dart';

const _statusLabels = {
  'SUCCEEDED': 'Paid',
  'PENDING': 'Pending',
  'FAILED': 'Failed',
  'REFUNDED': 'Refunded',
};

class PaymentHistoryCard extends StatelessWidget {
  final PaymentHistoryModel payment;

  const PaymentHistoryCard({super.key, required this.payment});

  @override
  Widget build(BuildContext context) {
    final mutedColor = Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.55);
    final statusColors = {
      'SUCCEEDED': Colors.green,
      'PENDING': mutedColor,
      'FAILED': AppColors.destructive,
      'REFUNDED': AppColors.primary,
    };
    final statusColor = statusColors[payment.status] ?? mutedColor;
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
                  child: Text(payment.restaurantName,
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    _statusLabels[payment.status] ?? payment.status,
                    style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              '${payment.reservationDate.day}/${payment.reservationDate.month}/${payment.reservationDate.year}'
              '${payment.reservationTime.isNotEmpty ? ' at ${payment.reservationTime}' : ''}',
              style: TextStyle(color: mutedColor, fontSize: 13),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${payment.currency} ${payment.amount.toStringAsFixed(0)}',
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                ),
                if (payment.receiptUrl != null)
                  TextButton.icon(
                    onPressed: () =>
                        launchUrl(Uri.parse(payment.receiptUrl!), mode: LaunchMode.externalApplication),
                    icon: const Icon(Icons.receipt_long, size: 14),
                    label: const Text('Receipt'),
                    style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(0, 0)),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
