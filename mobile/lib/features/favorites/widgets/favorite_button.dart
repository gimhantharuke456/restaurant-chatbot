import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/theme/app_colors.dart';
import '../data/favorites_repository.dart';

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
    final next = !_isFavorited;
    setState(() => _isFavorited = next);
    if (next) {
      await repository.addFavorite(widget.restaurantId);
    } else {
      await repository.removeFavorite(widget.restaurantId);
    }
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
