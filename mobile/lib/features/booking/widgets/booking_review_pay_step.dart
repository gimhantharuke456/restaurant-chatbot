import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../models/cart_item_model.dart';

const _serviceChargeRate = 0.10;

class BookingReviewPayStep extends StatefulWidget {
  final DateTime date;
  final String time;
  final int partySize;
  final List<CartItemModel> cartItems;
  final Future<void> Function() onPay;

  const BookingReviewPayStep({
    super.key,
    required this.date,
    required this.time,
    required this.partySize,
    required this.cartItems,
    required this.onPay,
  });

  @override
  State<BookingReviewPayStep> createState() => _BookingReviewPayStepState();
}

class _BookingReviewPayStepState extends State<BookingReviewPayStep> {
  bool _submitting = false;
  String? _error;

  Future<void> _submit() async {
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await widget.onPay();
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final subtotal = widget.cartItems.fold<double>(0, (s, i) => s + i.price * i.quantity);
    final serviceCharge = (subtotal * _serviceChargeRate).round();
    final total = subtotal + serviceCharge;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: Theme.of(context).colorScheme.secondary, borderRadius: BorderRadius.circular(12)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('${widget.date.year}-${widget.date.month.toString().padLeft(2, '0')}-${widget.date.day.toString().padLeft(2, '0')} at ${widget.time}'),
              Text('${widget.partySize} ${widget.partySize == 1 ? 'person' : 'people'}'),
            ],
          ),
        ),
        const SizedBox(height: 16),
        const Text('Your order', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
        const SizedBox(height: 8),
        ...widget.cartItems.map((item) => Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('${item.quantity}× ${item.name}'),
                  Text('LKR ${(item.price * item.quantity).toStringAsFixed(0)}'),
                ],
              ),
            )),
        const Divider(height: 24),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [const Text('Subtotal'), Text('LKR ${subtotal.toStringAsFixed(0)}')],
        ),
        const SizedBox(height: 4),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [const Text('Service charge (10%)'), Text('LKR ${serviceCharge.toStringAsFixed(0)}')],
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Total', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            Text('LKR ${total.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          ],
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          Text(_error!, style: const TextStyle(color: AppColors.destructive)),
        ],
        const SizedBox(height: 20),
        ElevatedButton(
          onPressed: _submitting ? null : _submit,
          child: _submitting
              ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
              : Text('Reserve & Pay LKR ${total.toStringAsFixed(0)}'),
        ),
      ],
    );
  }
}
