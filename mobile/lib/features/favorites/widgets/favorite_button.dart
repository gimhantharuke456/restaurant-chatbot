import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../data/favorites_repository.dart';

const _suggestedCollections = ['Favorites', 'Date Night', 'Family Dining', 'Business'];

/// A heart toggle that checks/adds/removes a restaurant from favorites.
/// Self-contained — reads FavoritesRepository from context directly, no
/// provider wiring needed at the call site.
class FavoriteButton extends StatefulWidget {
  final String restaurantId;

  const FavoriteButton({super.key, required this.restaurantId});

  @override
  State<FavoriteButton> createState() => _FavoriteButtonState();
}

class _FavoriteButtonState extends State<FavoriteButton> {
  bool _isFavorited = false;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _check();
  }

  Future<void> _check() async {
    try {
      final result = await context.read<FavoritesRepository>().checkFavorite(widget.restaurantId);
      if (mounted) setState(() => _isFavorited = result);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _toggle() async {
    final repository = context.read<FavoritesRepository>();
    if (_isFavorited) {
      setState(() => _isFavorited = false);
      await repository.removeFavorite(widget.restaurantId);
      return;
    }

    final favorites = await repository.getFavorites();
    final existingCollections = favorites.map((f) => f.collection).toSet();
    final options = {..._suggestedCollections, ...existingCollections}.toList();

    if (!mounted) return;
    final collection = await _pickCollection(context, options);
    if (collection == null) return;

    setState(() => _isFavorited = true);
    await repository.addFavorite(widget.restaurantId, collection: collection);
  }

  Future<String?> _pickCollection(BuildContext context, List<String> options) {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Save to collection'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: options
                    .map((c) => ActionChip(
                          label: Text(c),
                          onPressed: () => Navigator.pop(context, c),
                        ))
                    .toList(),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: controller,
                decoration: const InputDecoration(hintText: 'New collection name'),
                onChanged: (_) => setDialogState(() {}),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: controller.text.trim().isEmpty
                  ? null
                  : () => Navigator.pop(context, controller.text.trim()),
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const SizedBox(width: 48);
    return IconButton(
      onPressed: _toggle,
      tooltip: _isFavorited ? 'Remove from favorites' : 'Save to favorites',
      icon: Icon(
        _isFavorited ? Icons.favorite : Icons.favorite_border,
        color: _isFavorited ? AppColors.destructive : null,
      ),
    );
  }
}
