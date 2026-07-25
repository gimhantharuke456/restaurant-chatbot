import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';

class ChatInput extends StatefulWidget {
  final ValueChanged<String> onSend;
  final bool disabled;

  const ChatInput({super.key, required this.onSend, required this.disabled});

  @override
  State<ChatInput> createState() => _ChatInputState();
}

class _ChatInputState extends State<ChatInput> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _submit() {
    final text = _controller.text.trim();
    if (text.isEmpty || widget.disabled) return;
    widget.onSend(text);
    _controller.clear();
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(
          child: TextField(
            controller: _controller,
            enabled: !widget.disabled,
            minLines: 1,
            maxLines: 4,
            textInputAction: TextInputAction.send,
            onSubmitted: (_) => _submit(),
            decoration: const InputDecoration(
              hintText: 'Ask about restaurants, get recommendations, or book a table…',
            ),
          ),
        ),
        const SizedBox(width: 8),
        IconButton.filled(
          onPressed: widget.disabled ? null : _submit,
          icon: const Icon(Icons.send),
          style: IconButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: AppColors.foreground,
          ),
        ),
      ],
    );
  }
}
