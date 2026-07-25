import 'package:flutter/material.dart';
import '../../core/motion/skeleton_loader.dart';

class LoadingView extends StatelessWidget {
  const LoadingView({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 5,
      itemBuilder: (context, index) => const Padding(
        padding: EdgeInsets.only(bottom: 12),
        child: SkeletonLoader(height: 88, borderRadius: BorderRadius.all(Radius.circular(14))),
      ),
    );
  }
}
