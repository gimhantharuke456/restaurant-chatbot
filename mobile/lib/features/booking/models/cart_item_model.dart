class CartItemModel {
  final String menuItemId;
  final String name;
  final double price;
  final int quantity;
  final String category;

  const CartItemModel({
    required this.menuItemId,
    required this.name,
    required this.price,
    required this.quantity,
    required this.category,
  });

  Map<String, dynamic> toOrderItemJson() => {
        'menuItemId': menuItemId,
        'name': name,
        'price': price,
        'quantity': quantity,
        'category': category,
      };
}
