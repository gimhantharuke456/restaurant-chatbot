import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/network/api_exception.dart';
import '../providers/waitlist_provider.dart';

Future<void> showJoinWaitlistSheet(
  BuildContext context, {
  required String restaurantId,
  required String restaurantName,
}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    builder: (context) => _JoinWaitlistSheet(restaurantId: restaurantId, restaurantName: restaurantName),
  );
}

class _JoinWaitlistSheet extends StatefulWidget {
  final String restaurantId;
  final String restaurantName;

  const _JoinWaitlistSheet({required this.restaurantId, required this.restaurantName});

  @override
  State<_JoinWaitlistSheet> createState() => _JoinWaitlistSheetState();
}

class _JoinWaitlistSheetState extends State<_JoinWaitlistSheet> {
  DateTime? _date;
  TimeOfDay _time = const TimeOfDay(hour: 19, minute: 0);
  int _partySize = 2;
  String? _error;
  bool _submitting = false;
  int? _joinedPosition;

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _date ?? now,
      firstDate: now,
      lastDate: now.add(const Duration(days: 90)),
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(context: context, initialTime: _time);
    if (picked != null) setState(() => _time = picked);
  }

  Future<void> _submit() async {
    if (_date == null) {
      setState(() => _error = 'Please pick a date.');
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    final provider = context.read<WaitlistProvider>();
    try {
      final entry = await provider.join(
        restaurantId: widget.restaurantId,
        date: _date!,
        time: '${_time.hour.toString().padLeft(2, '0')}:${_time.minute.toString().padLeft(2, '0')}',
        partySize: _partySize,
      );
      if (mounted) setState(() => _joinedPosition = entry?.position);
    } catch (e) {
      final message = e is ApiException ? e.message : 'Failed to join waitlist.';
      if (mounted) setState(() => _error = message);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: _joinedPosition != null
          ? Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text("You're on the waitlist!", style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 6),
                Text('Position #$_joinedPosition at ${widget.restaurantName}. '
                    "You'll be notified when a slot opens."),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Done'),
                  ),
                ),
              ],
            )
          : Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Join the Waitlist', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _pickDate,
                        child: Text(_date == null
                            ? 'Pick date'
                            : '${_date!.day}/${_date!.month}/${_date!.year}'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _pickTime,
                        child: Text(_time.format(context)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Text('Party size'),
                    const Spacer(),
                    IconButton(
                      onPressed: _partySize > 1 ? () => setState(() => _partySize--) : null,
                      icon: const Icon(Icons.remove_circle_outline),
                    ),
                    Text('$_partySize', style: const TextStyle(fontWeight: FontWeight.w600)),
                    IconButton(
                      onPressed: _partySize < 20 ? () => setState(() => _partySize++) : null,
                      icon: const Icon(Icons.add_circle_outline),
                    ),
                  ],
                ),
                if (_error != null) ...[
                  const SizedBox(height: 8),
                  Text(_error!, style: const TextStyle(color: Colors.red)),
                ],
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _submitting ? null : _submit,
                    child: Text(_submitting ? 'Joining…' : 'Join Waitlist'),
                  ),
                ),
              ],
            ),
    );
  }
}
