import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/motion/entrance.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/empty_state_view.dart';
import '../../../shared/widgets/error_retry_view.dart';
import '../../../shared/widgets/loading_view.dart';
import '../models/loyalty_model.dart';
import '../providers/loyalty_provider.dart';

const _tierColors = {
  'BRONZE': Color(0xFFB08D57),
  'SILVER': Color(0xFFB0B8C1),
  'GOLD': Color(0xFFFFD700),
  'PLATINUM': Color(0xFFC9A6FF),
};
const _tierNextThreshold = {'BRONZE': 500, 'SILVER': 2000, 'GOLD': 5000, 'PLATINUM': null};
const _tierNextLabel = {'BRONZE': 'Silver', 'SILVER': 'Gold', 'GOLD': 'Platinum', 'PLATINUM': null};
const _tierMin = {'BRONZE': 0, 'SILVER': 500, 'GOLD': 2000, 'PLATINUM': 5000};

const _txIcons = {
  'EARN_RESERVATION': Icons.arrow_upward,
  'EARN_REVIEW': Icons.arrow_upward,
  'EARN_PAYMENT': Icons.arrow_upward,
  'REDEEM': Icons.arrow_downward,
  'ADJUSTMENT': Icons.swap_vert,
};

class LoyaltyScreen extends StatefulWidget {
  const LoyaltyScreen({super.key});

  @override
  State<LoyaltyScreen> createState() => _LoyaltyScreenState();
}

class _LoyaltyScreenState extends State<LoyaltyScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<LoyaltyProvider>().fetch();
    });
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<LoyaltyProvider>();

    return Scaffold(
      appBar: AppBar(title: const Text('Loyalty Rewards')),
      body: Builder(builder: (context) {
        if (provider.isLoading && provider.account == null) {
          return const LoadingView();
        }
        if (provider.error != null && provider.account == null) {
          return ErrorRetryView(message: provider.error!, onRetry: provider.fetch);
        }
        final account = provider.account;
        if (account == null || account.totalEarned == 0 && account.points == 0) {
          return const EmptyStateView(
            icon: Icons.emoji_events_outlined,
            title: 'No loyalty account yet',
            subtitle: 'Make a reservation to start earning points.',
          );
        }

        return RefreshIndicator(
          onRefresh: provider.fetch,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _TierCard(account: account),
              const SizedBox(height: 20),
              const Text('HISTORY',
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12, letterSpacing: 0.5)),
              const SizedBox(height: 8),
              if (provider.transactions.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 16),
                  child: Text('No activity yet', style: TextStyle(color: AppColors.mutedForeground)),
                ),
              ...provider.transactions.asMap().entries.map((e) => staggeredEntrance(
                    _TransactionTile(transaction: e.value),
                    index: e.key,
                  )),
            ],
          ),
        );
      }),
    );
  }
}

class _TierCard extends StatelessWidget {
  final LoyaltyModel account;

  const _TierCard({required this.account});

  @override
  Widget build(BuildContext context) {
    final tierColor = _tierColors[account.tier] ?? AppColors.mutedForeground;
    final nextThreshold = _tierNextThreshold[account.tier];
    final nextLabel = _tierNextLabel[account.tier];
    final min = _tierMin[account.tier] ?? 0;
    final progress = nextThreshold == null
        ? 1.0
        : ((account.points - min) / (nextThreshold - min)).clamp(0.0, 1.0);

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(color: tierColor, shape: BoxShape.circle),
                child: const Icon(Icons.emoji_events, color: Colors.white),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(account.tier, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
                  Text('${account.points} pts', style: const TextStyle(color: AppColors.mutedForeground)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (nextThreshold == null)
            const Text("You've reached the highest tier — Platinum!",
                style: TextStyle(color: AppColors.mutedForeground, fontSize: 12))
          else ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('${account.points} pts', style: const TextStyle(color: AppColors.mutedForeground, fontSize: 12)),
                Text('$nextThreshold pts to $nextLabel',
                    style: const TextStyle(color: AppColors.mutedForeground, fontSize: 12)),
              ],
            ),
            const SizedBox(height: 6),
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: LinearProgressIndicator(
                value: progress,
                minHeight: 8,
                backgroundColor: AppColors.muted,
                valueColor: const AlwaysStoppedAnimation(AppColors.primary),
              ),
            ),
          ],
          const SizedBox(height: 12),
          Text('Total earned: ${account.totalEarned} pts',
              style: const TextStyle(color: AppColors.mutedForeground, fontSize: 12)),
        ],
      ),
    );
  }
}

class _TransactionTile extends StatelessWidget {
  final LoyaltyTransactionModel transaction;

  const _TransactionTile({required this.transaction});

  @override
  Widget build(BuildContext context) {
    final isPositive = transaction.points >= 0;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: const BoxDecoration(color: AppColors.muted, shape: BoxShape.circle),
            child: Icon(_txIcons[transaction.type] ?? Icons.swap_vert, size: 16, color: AppColors.mutedForeground),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(transaction.description, style: const TextStyle(fontSize: 13)),
                Text(
                  '${transaction.createdAt.year}-${transaction.createdAt.month.toString().padLeft(2, '0')}-${transaction.createdAt.day.toString().padLeft(2, '0')}',
                  style: const TextStyle(color: AppColors.mutedForeground, fontSize: 11),
                ),
              ],
            ),
          ),
          Text(
            '${isPositive ? '+' : ''}${transaction.points}',
            style: TextStyle(
              color: isPositive ? Colors.green : AppColors.destructive,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
