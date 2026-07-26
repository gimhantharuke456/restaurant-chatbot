import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// A simple hub for secondary features that don't warrant their own
/// bottom-nav tab. Add new entries here as they're built (profile,
/// notifications, loyalty, etc.).
class MoreMenuScreen extends StatelessWidget {
  const MoreMenuScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('More')),
      body: ListView(
        children: [
          ListTile(
            leading: const Icon(Icons.favorite_border),
            title: const Text('Saved Restaurants'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/favorites'),
          ),
          ListTile(
            leading: const Icon(Icons.emoji_events_outlined),
            title: const Text('Loyalty Rewards'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/loyalty'),
          ),
        ],
      ),
    );
  }
}
