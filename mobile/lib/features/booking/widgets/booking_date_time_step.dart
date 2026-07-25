import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../models/slot_model.dart';

class BookingDateTimeStep extends StatelessWidget {
  final DateTime date;
  final ValueChanged<DateTime> onDateChanged;
  final List<SlotModel>? slots;
  final bool loadingSlots;
  final String? selectedTime;
  final ValueChanged<String> onTimeSelected;
  final int partySize;
  final int maxParty;
  final ValueChanged<int> onPartySizeChanged;
  final String specialRequests;
  final ValueChanged<String> onSpecialRequestsChanged;
  final VoidCallback onContinue;
  final bool canContinue;

  const BookingDateTimeStep({
    super.key,
    required this.date,
    required this.onDateChanged,
    required this.slots,
    required this.loadingSlots,
    required this.selectedTime,
    required this.onTimeSelected,
    required this.partySize,
    required this.maxParty,
    required this.onPartySizeChanged,
    required this.specialRequests,
    required this.onSpecialRequestsChanged,
    required this.onContinue,
    required this.canContinue,
  });

  Future<void> _pickDate(BuildContext context) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: date,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 90)),
    );
    if (picked != null) onDateChanged(picked);
  }

  @override
  Widget build(BuildContext context) {
    final dateLabel =
        '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('Date', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
        const SizedBox(height: 6),
        OutlinedButton.icon(
          onPressed: () => _pickDate(context),
          icon: const Icon(Icons.calendar_today, size: 16),
          label: Text(dateLabel),
        ),
        const SizedBox(height: 20),
        const Text('Time', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
        const SizedBox(height: 6),
        if (loadingSlots)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 8),
            child: LinearProgressIndicator(),
          )
        else
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: (slots ?? const <SlotModel>[]).map((s) {
              final isSelected = selectedTime == s.time;
              return ChoiceChip(
                label: Text(s.time),
                selected: isSelected,
                onSelected: s.available ? (_) => onTimeSelected(s.time) : null,
                disabledColor: AppColors.muted,
                selectedColor: AppColors.primary,
                labelStyle: TextStyle(
                  color: !s.available
                      ? AppColors.mutedForeground
                      : isSelected
                          ? AppColors.foreground
                          : null,
                  decoration: !s.available ? TextDecoration.lineThrough : null,
                ),
              );
            }).toList(),
          ),
        const SizedBox(height: 20),
        const Text('Party size', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
        const SizedBox(height: 6),
        Row(
          children: [
            IconButton(
              onPressed: partySize > 1 ? () => onPartySizeChanged(partySize - 1) : null,
              icon: const Icon(Icons.remove_circle_outline),
            ),
            Text('$partySize ${partySize == 1 ? 'person' : 'people'}'),
            IconButton(
              onPressed: partySize < maxParty ? () => onPartySizeChanged(partySize + 1) : null,
              icon: const Icon(Icons.add_circle_outline),
            ),
          ],
        ),
        const SizedBox(height: 20),
        const Text('Special requests (optional)', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
        const SizedBox(height: 6),
        TextField(
          maxLength: 500,
          maxLines: 2,
          onChanged: onSpecialRequestsChanged,
          decoration: const InputDecoration(
            hintText: 'Allergies, dietary needs, anniversary…',
          ),
        ),
        const SizedBox(height: 12),
        ElevatedButton(
          onPressed: canContinue ? onContinue : null,
          child: const Text('Choose Your Order'),
        ),
      ],
    );
  }
}
