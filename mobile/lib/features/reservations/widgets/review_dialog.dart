import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/theme/app_colors.dart';

typedef UploadImage = Future<String?> Function(List<int> bytes, String filename);

class ReviewResult {
  final int rating;
  final String? comment;
  final List<String> imageUrls;

  const ReviewResult({required this.rating, this.comment, this.imageUrls = const []});
}

/// Star rating + comment + photo form, shown as a dialog. Returns null if cancelled.
Future<ReviewResult?> showReviewDialog(
  BuildContext context, {
  required String restaurantName,
  required UploadImage onUploadImage,
  int? initialRating,
  String? initialComment,
}) {
  return showDialog<ReviewResult>(
    context: context,
    builder: (context) => _ReviewDialogContent(
      restaurantName: restaurantName,
      onUploadImage: onUploadImage,
      initialRating: initialRating,
      initialComment: initialComment,
    ),
  );
}

class _ReviewDialogContent extends StatefulWidget {
  final String restaurantName;
  final UploadImage onUploadImage;
  final int? initialRating;
  final String? initialComment;

  const _ReviewDialogContent({
    required this.restaurantName,
    required this.onUploadImage,
    this.initialRating,
    this.initialComment,
  });

  @override
  State<_ReviewDialogContent> createState() => _ReviewDialogContentState();
}

class _ReviewDialogContentState extends State<_ReviewDialogContent> {
  late int _rating = widget.initialRating ?? 0;
  late final _commentController = TextEditingController(text: widget.initialComment ?? '');
  final List<String> _imageUrls = [];
  bool _uploading = false;
  String? _uploadError;

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _pickAndUploadImage() async {
    if (_imageUrls.length >= 3) return;
    final picked = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 80);
    if (picked == null) return;

    setState(() {
      _uploading = true;
      _uploadError = null;
    });
    try {
      final bytes = await picked.readAsBytes();
      final url = await widget.onUploadImage(bytes, picked.name);
      if (url != null) {
        setState(() => _imageUrls.add(url));
      }
    } catch (e) {
      setState(() => _uploadError = 'Failed to upload photo');
    } finally {
      setState(() => _uploading = false);
    }
  }

  void _removeImage(int index) {
    setState(() => _imageUrls.removeAt(index));
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('Review ${widget.restaurantName}'),
      content: SingleChildScrollView(
        child: Column(
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
            const SizedBox(height: 8),
            Text('Photos (up to 3, optional)', style: Theme.of(context).textTheme.labelMedium),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (var i = 0; i < _imageUrls.length; i++)
                  Stack(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.network(
                          _imageUrls[i],
                          width: 64,
                          height: 64,
                          fit: BoxFit.cover,
                        ),
                      ),
                      Positioned(
                        top: -6,
                        right: -6,
                        child: IconButton(
                          icon: const Icon(Icons.cancel, size: 18),
                          onPressed: () => _removeImage(i),
                        ),
                      ),
                    ],
                  ),
                if (_imageUrls.length < 3)
                  InkWell(
                    onTap: _uploading ? null : _pickAndUploadImage,
                    child: Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        border: Border.all(color: AppColors.mutedForeground.withValues(alpha: 0.4)),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: _uploading
                          ? const Center(
                              child: SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              ),
                            )
                          : const Icon(Icons.add_a_photo_outlined),
                    ),
                  ),
              ],
            ),
            if (_uploadError != null) ...[
              const SizedBox(height: 4),
              Text(_uploadError!, style: const TextStyle(color: Colors.red, fontSize: 12)),
            ],
          ],
        ),
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
                      imageUrls: _imageUrls,
                    ),
                  ),
          child: const Text('Submit'),
        ),
      ],
    );
  }
}
