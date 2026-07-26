import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';

class ReviewResult {
  final int rating;
  final String? comment;

  const ReviewResult({required this.rating, this.comment});
}

/// Star rating + comment form, shown as a dialog. Returns null if cancelled.
Future<ReviewResult?> showReviewDialog(
  BuildContext context, {
  required String restaurantName,
  int? initialRating,
  String? initialComment,
}) {
  return showDialog<ReviewResult>(
    context: context,
    builder: (context) => _ReviewDialogContent(
      restaurantName: restaurantName,
      initialRating: initialRating,
      initialComment: initialComment,
    ),
  );
}

class _ReviewDialogContent extends StatefulWidget {
  final String restaurantName;
  final int? initialRating;
  final String? initialComment;

  const _ReviewDialogContent({
    required this.restaurantName,
    this.initialRating,
    this.initialComment,
  });

  @override
  State<_ReviewDialogContent> createState() => _ReviewDialogContentState();
}

class _ReviewDialogContentState extends State<_ReviewDialogContent> {
  late int _rating = widget.initialRating ?? 0;
  late final _commentController = TextEditingController(text: widget.initialComment ?? '');

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('Review ${widget.restaurantName}'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(5, (i) {
              final starValue = i + 1;
              return IconButton(
                onPressed: () => setState(() => _rating = starValue),
                icon: Icon(
                  starValue <= _rating ? Icons.star : Icons.star_border,
                  color: AppColors.primary,
                  size: 28,
                ),
              );
            }),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _commentController,
            maxLines: 3,
            maxLength: 1000,
            decoration: const InputDecoration(hintText: 'Share your experience (optional)'),
          ),
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        ElevatedButton(
          onPressed: _rating == 0
              ? null
              : () => Navigator.pop(
                    context,
                    ReviewResult(
                      rating: _rating,
                      comment: _commentController.text.trim().isEmpty
                          ? null
                          : _commentController.text.trim(),
                    ),
                  ),
          child: const Text('Submit'),
        ),
      ],
    );
  }
}
