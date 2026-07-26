import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/app_network_image.dart';
import '../../../shared/widgets/empty_state_view.dart';
import '../../../shared/widgets/loading_view.dart';
import '../../restaurants/models/menu_item_model.dart';
import '../models/cart_item_model.dart';

class BookingMenuCartStep extends StatelessWidget {
  final List<MenuItemModel> menuItems;
  final bool loadingMenu;
  final Map<String, CartItemModel> cart;
  final void Function(MenuItemModel item, int quantity) onQuantityChanged;
  final VoidCallback onContinue;
  final bool canContinue;

  const BookingMenuCartStep({
    super.key,
    required this.menuItems,
    required this.loadingMenu,
    required this.cart,
    required this.onQuantityChanged,
    required this.onContinue,
    required this.canContinue,
  });

  @override
  Widget build(BuildContext context) {
    if (loadingMenu) {
      return const LoadingView();
    }
    if (menuItems.isEmpty) {
      return const EmptyStateView(
        icon: Icons.restaurant_menu,
        title: 'No menu items available',
        subtitle: "This restaurant hasn't added a menu yet.",
      );
    }

    final categories = menuItems.map((i) => i.category).toSet().toList();
    final totalItems = cart.values.fold<int>(0, (s, i) => s + i.quantity);

    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: categories.expand((category) {
              final items = menuItems.where((i) => i.category == category).toList();
              return [
                Padding(
                  padding: const EdgeInsets.only(bottom: 8, top: 8),
                  child: Text(
                    category,
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12, color: AppColors.mutedForeground),
                  ),
                ),
                ...items.map((item) {
                  final qty = cart[item.id]?.quantity ?? 0;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      children: [
                        AppNetworkImage(
                          url: item.imageUrl,
                          width: 48,
                          height: 48,
                          borderRadius: BorderRadius.circular(8),
                          fallbackIcon: Icons.restaurant_menu,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(item.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                              Text('LKR ${item.price.toStringAsFixed(0)}',
                                  style: const TextStyle(color: AppColors.primary, fontSize: 13)),
                            ],
                          ),
                        ),
                        IconButton(
                          onPressed: qty > 0 ? () => onQuantityChanged(item, qty - 1) : null,
                          icon: const Icon(Icons.remove_circle_outline),
                        ),
                        Text('$qty'),
                        IconButton(
                          onPressed: () => onQuantityChanged(item, qty + 1),
                          icon: const Icon(Icons.add_circle_outline),
                        ),
                      ],
                    ),
                  );
                }),
              ];
            }).toList(),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(16),
          child: ElevatedButton(
            onPressed: canContinue ? onContinue : null,
            child: Text(totalItems > 0 ? 'Review Order ($totalItems item${totalItems == 1 ? '' : 's'})' : 'Review Order'),
          ),
        ),
      ],
    );
  }
}
