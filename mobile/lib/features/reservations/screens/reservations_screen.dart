import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/motion/entrance.dart';
import '../../../shared/widgets/empty_state_view.dart';
import '../../../shared/widgets/error_retry_view.dart';
import '../../../shared/widgets/loading_view.dart';
import '../models/my_reservation_model.dart';
import '../providers/reservations_provider.dart';
import '../widgets/reservation_card.dart';
import '../widgets/review_dialog.dart';

class ReservationsScreen extends StatefulWidget {
  const ReservationsScreen({super.key});

  @override
  State<ReservationsScreen> createState() => _ReservationsScreenState();
}

class _ReservationsScreenState extends State<ReservationsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ReservationsProvider>().fetch();
    });
  }

  Future<void> _confirmCancel(MyReservationModel reservation) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel reservation?'),
        content: Text('This will cancel your booking at ${reservation.restaurantName}.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Keep it')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Cancel reservation'),
          ),
        ],
      ),
    );
    if (confirmed == true && mounted) {
      await context.read<ReservationsProvider>().cancel(reservation.id);
    }
  }

  Future<void> _writeReview(MyReservationModel reservation) async {
    final provider = context.read<ReservationsProvider>();
    final result = await showReviewDialog(
      context,
      restaurantName: reservation.restaurantName,
      onUploadImage: provider.uploadReviewImage,
      initialRating: reservation.reviewRating,
      initialComment: reservation.reviewComment,
    );
    if (result != null && mounted) {
      await provider.submitReview(
        reservation.id,
        rating: result.rating,
        comment: result.comment,
        imageUrls: result.imageUrls,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ReservationsProvider>();

    return Scaffold(
      appBar: AppBar(title: const Text('My Reservations')),
      body: Builder(builder: (context) {
        if (provider.isLoading && provider.reservations.isEmpty) {
          return const LoadingView();
        }
        if (provider.error != null && provider.reservations.isEmpty) {
          return ErrorRetryView(message: provider.error!, onRetry: provider.fetch);
        }
        if (provider.reservations.isEmpty) {
          return const EmptyStateView(
            icon: Icons.event_busy,
            title: 'No reservations yet',
            subtitle: 'Head to the Chat tab to discover and book restaurants.',
          );
        }

        final upcoming =
            provider.reservations.where((r) => r.status == 'PENDING' || r.status == 'CONFIRMED').toList();
        final past =
            provider.reservations.where((r) => r.status != 'PENDING' && r.status != 'CONFIRMED').toList();

        return RefreshIndicator(
          onRefresh: provider.fetch,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (upcoming.isNotEmpty) ...[
                const Text('UPCOMING',
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12, letterSpacing: 0.5)),
                const SizedBox(height: 8),
                ...upcoming.asMap().entries.map((e) => staggeredEntrance(
                      ReservationCard(
                        reservation: e.value,
                        onCancel: () => _confirmCancel(e.value),
                      ),
                      index: e.key,
                    )),
                const SizedBox(height: 16),
              ],
              if (past.isNotEmpty) ...[
                const Text('PAST',
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12, letterSpacing: 0.5)),
                const SizedBox(height: 8),
                ...past.asMap().entries.map((e) => staggeredEntrance(
                      ReservationCard(
                        reservation: e.value,
                        onReview: () => _writeReview(e.value),
                      ),
                      index: e.key,
                    )),
              ],
            ],
          ),
        );
      }),
    );
  }
}
