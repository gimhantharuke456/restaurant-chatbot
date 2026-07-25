import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:provider/provider.dart';
import '../../../core/motion/app_motion.dart';
import '../../restaurants/data/restaurant_repository.dart';
import '../../restaurants/models/menu_item_model.dart';
import '../../restaurants/models/restaurant_model.dart';
import '../data/booking_repository.dart';
import '../models/cart_item_model.dart';
import '../models/slot_model.dart';
import '../widgets/booking_date_time_step.dart';
import '../widgets/booking_menu_cart_step.dart';
import '../widgets/booking_review_pay_step.dart';

class BookingFlowScreen extends StatefulWidget {
  final String restaurantId;

  const BookingFlowScreen({super.key, required this.restaurantId});

  @override
  State<BookingFlowScreen> createState() => _BookingFlowScreenState();
}

class _BookingFlowScreenState extends State<BookingFlowScreen> {
  int _step = 1;

  RestaurantModel? _restaurant;
  DateTime _date = DateTime.now();
  String? _time;
  int _partySize = 2;
  String _specialRequests = '';
  List<SlotModel>? _slots;
  bool _loadingSlots = false;

  List<MenuItemModel> _menuItems = [];
  bool _loadingMenu = false;
  final Map<String, CartItemModel> _cart = {};

  String? _reservationId;

  @override
  void initState() {
    super.initState();
    _loadRestaurant();
    _loadSlots();
  }

  Future<void> _loadRestaurant() async {
    final restaurant =
        await context.read<RestaurantRepository>().getRestaurantById(widget.restaurantId);
    if (mounted) setState(() => _restaurant = restaurant);
  }

  Future<void> _loadSlots() async {
    setState(() => _loadingSlots = true);
    final dateStr =
        '${_date.year.toString().padLeft(4, '0')}-${_date.month.toString().padLeft(2, '0')}-${_date.day.toString().padLeft(2, '0')}';
    try {
      final slots = await context
          .read<BookingRepository>()
          .getAvailability(widget.restaurantId, dateStr);
      if (mounted) setState(() => _slots = slots);
    } catch (_) {
      if (mounted) setState(() => _slots = null);
    } finally {
      if (mounted) setState(() => _loadingSlots = false);
    }
  }

  Future<void> _loadMenu() async {
    if (_menuItems.isNotEmpty) return;
    setState(() => _loadingMenu = true);
    try {
      final items = await context.read<RestaurantRepository>().getMenu(widget.restaurantId);
      if (mounted) setState(() => _menuItems = items);
    } finally {
      if (mounted) setState(() => _loadingMenu = false);
    }
  }

  void _setQuantity(MenuItemModel item, int quantity) {
    setState(() {
      if (quantity <= 0) {
        _cart.remove(item.id);
      } else {
        _cart[item.id] = CartItemModel(
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: quantity,
          category: item.category,
        );
      }
    });
  }

  Future<void> _pay() async {
    final bookingRepo = context.read<BookingRepository>();

    // Reuse the reservation from a previous attempt if the user is retrying
    // after a declined/cancelled payment, instead of creating a duplicate.
    _reservationId ??= (await bookingRepo.createReservation(
      restaurantId: widget.restaurantId,
      date: '${_date.year.toString().padLeft(4, '0')}-${_date.month.toString().padLeft(2, '0')}-${_date.day.toString().padLeft(2, '0')}',
      time: _time!,
      partySize: _partySize,
      specialRequests: _specialRequests.isEmpty ? null : _specialRequests,
    )).id;

    final intent = await bookingRepo.createPaymentIntent(
      reservationId: _reservationId!,
      orderItems: _cart.values.toList(),
    );

    await Stripe.instance.initPaymentSheet(
      paymentSheetParameters: SetupPaymentSheetParameters(
        paymentIntentClientSecret: intent.clientSecret,
        merchantDisplayName: 'Restaurant Chatbot',
      ),
    );

    try {
      await Stripe.instance.presentPaymentSheet();
    } on StripeException catch (e) {
      if (e.error.code == FailureCode.Canceled) return; // not an error, just return to review
      throw Exception(e.error.localizedMessage ?? e.error.message ?? 'Payment failed');
    }

    await _showSuccessAndPop();
  }

  Future<void> _showSuccessAndPop() async {
    if (!mounted) return;
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.black54,
      builder: (dialogContext) {
        Future.delayed(const Duration(milliseconds: 800), () {
          if (dialogContext.mounted) Navigator.of(dialogContext).pop();
        });
        return Center(
          child: const Icon(Icons.check_circle, color: Colors.green, size: 96)
              .animate()
              .scale(duration: AppMotion.standard, curve: Curves.elasticOut)
              .fadeIn(duration: AppMotion.fast),
        );
      },
    );
    if (!mounted) return;
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_restaurant?.name ?? 'Reserve a table'),
        leading: _step > 1
            ? IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => setState(() => _step -= 1),
              )
            : null,
      ),
      body: AnimatedSwitcher(
        duration: AppMotion.standard,
        transitionBuilder: (child, animation) {
          final curved = CurvedAnimation(parent: animation, curve: AppMotion.standardCurve);
          return FadeTransition(
            opacity: curved,
            child: SlideTransition(
              position: Tween<Offset>(begin: const Offset(0.05, 0), end: Offset.zero)
                  .animate(curved),
              child: child,
            ),
          );
        },
        child: KeyedSubtree(
          key: ValueKey(_step),
          child: Builder(builder: (context) {
            switch (_step) {
              case 1:
                return BookingDateTimeStep(
                  date: _date,
                  onDateChanged: (d) {
                    setState(() => _date = d);
                    _loadSlots();
                  },
                  slots: _slots,
                  loadingSlots: _loadingSlots,
                  selectedTime: _time,
                  onTimeSelected: (t) => setState(() => _time = t),
                  partySize: _partySize,
                  maxParty: _restaurant?.totalSeats ?? 20,
                  onPartySizeChanged: (p) => setState(() => _partySize = p),
                  specialRequests: _specialRequests,
                  onSpecialRequestsChanged: (v) => _specialRequests = v,
                  canContinue: _time != null,
                  onContinue: () {
                    setState(() => _step = 2);
                    _loadMenu();
                  },
                );
              case 2:
                return BookingMenuCartStep(
                  menuItems: _menuItems,
                  loadingMenu: _loadingMenu,
                  cart: _cart,
                  onQuantityChanged: _setQuantity,
                  canContinue: _cart.isNotEmpty,
                  onContinue: () => setState(() => _step = 3),
                );
              default:
                return BookingReviewPayStep(
                  date: _date,
                  time: _time!,
                  partySize: _partySize,
                  cartItems: _cart.values.toList(),
                  onPay: _pay,
                );
            }
          }),
        ),
      ),
    );
  }
}
