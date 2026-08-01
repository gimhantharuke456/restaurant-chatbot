import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/motion/entrance.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/empty_state_view.dart';
import '../../../shared/widgets/error_retry_view.dart';
import '../../../shared/widgets/loading_view.dart';
import '../models/complaint_model.dart';
import '../providers/complaints_provider.dart';

const _statusLabels = {
  'OPEN': 'Open',
  'UNDER_REVIEW': 'Under Review',
  'RESOLVED': 'Resolved',
  'CLOSED': 'Closed',
};

class ComplaintsScreen extends StatefulWidget {
  const ComplaintsScreen({super.key});

  @override
  State<ComplaintsScreen> createState() => _ComplaintsScreenState();
}

class _ComplaintsScreenState extends State<ComplaintsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ComplaintsProvider>().fetch();
    });
  }

  Future<void> _openForm() async {
    final subjectController = TextEditingController();
    final descriptionController = TextEditingController();
    final provider = context.read<ComplaintsProvider>();

    final submitted = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetContext) => StatefulBuilder(
        builder: (sheetContext, setSheetState) {
          final canSubmit = subjectController.text.trim().isNotEmpty &&
              descriptionController.text.trim().isNotEmpty;

          return Padding(
            padding: EdgeInsets.fromLTRB(
              20, 20, 20,
              MediaQuery.of(sheetContext).viewInsets.bottom + 24,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    const Expanded(
                      child: Text(
                        'New Complaint',
                        style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(sheetContext, false),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: subjectController,
                  textCapitalization: TextCapitalization.sentences,
                  decoration: const InputDecoration(
                    labelText: 'Subject',
                    border: OutlineInputBorder(),
                  ),
                  onChanged: (_) => setSheetState(() {}),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: descriptionController,
                  maxLines: 4,
                  textCapitalization: TextCapitalization.sentences,
                  decoration: const InputDecoration(
                    labelText: 'Description',
                    alignLabelWithHint: true,
                    border: OutlineInputBorder(),
                  ),
                  onChanged: (_) => setSheetState(() {}),
                ),
                const SizedBox(height: 20),
                ElevatedButton(
                  onPressed: canSubmit
                      ? () async {
                          final ok = await provider.submit(
                            subject: subjectController.text.trim(),
                            description: descriptionController.text.trim(),
                          );
                          if (sheetContext.mounted) Navigator.pop(sheetContext, ok);
                        }
                      : null,
                  style: ElevatedButton.styleFrom(
                    minimumSize: const Size.fromHeight(48),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Submit'),
                ),
              ],
            ),
          );
        },
      ),
    );

    if (submitted == false && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to submit complaint. Please try again.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ComplaintsProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Complaints'),
        actions: [IconButton(onPressed: _openForm, icon: const Icon(Icons.add))],
      ),
      body: Builder(builder: (context) {
        if (provider.isLoading && provider.complaints.isEmpty) {
          return const LoadingView();
        }
        if (provider.error != null && provider.complaints.isEmpty) {
          return ErrorRetryView(message: provider.error!, onRetry: provider.fetch);
        }
        if (provider.complaints.isEmpty) {
          return const EmptyStateView(
            icon: Icons.report_problem_outlined,
            title: 'No complaints filed',
            subtitle: 'Tap + to raise an issue with us.',
          );
        }

        return RefreshIndicator(
          onRefresh: provider.fetch,
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: provider.complaints.length,
            itemBuilder: (context, index) {
              final complaint = provider.complaints[index];
              return staggeredEntrance(_ComplaintCard(complaint: complaint), index: index);
            },
          ),
        );
      }),
    );
  }
}

class _ComplaintCard extends StatelessWidget {
  final ComplaintModel complaint;

  const _ComplaintCard({required this.complaint});

  @override
  Widget build(BuildContext context) {
    final mutedColor = Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.55);
    final statusColors = {
      'OPEN': AppColors.destructive,
      'UNDER_REVIEW': AppColors.primary,
      'RESOLVED': Colors.green,
      'CLOSED': mutedColor,
    };
    final statusColor = statusColors[complaint.status] ?? mutedColor;
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
                  child: Text(complaint.subject, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    _statusLabels[complaint.status] ?? complaint.status,
                    style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(complaint.description, style: TextStyle(color: mutedColor, fontSize: 13)),
            if (complaint.adminNote != null && complaint.adminNote!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: Theme.of(context).colorScheme.secondary, borderRadius: BorderRadius.circular(8)),
                child: Text(
                  'Response: ${complaint.adminNote}',
                  style: const TextStyle(fontSize: 12, fontStyle: FontStyle.italic),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
