import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

const _paymentLinkMarker = 'Payment link:';
final _stripeUrlPattern = RegExp(r'https://checkout\.stripe\.com/[^\s<>"]+');

class ExtractedPayment {
  final String displayText;
  final String? paymentUrl;

  const ExtractedPayment({required this.displayText, this.paymentUrl});
}

/// Mirrors the web's `extractPaymentUrl` + payment-link stripping in
/// `MessageText` (frontend/src/components/chat/MessageBubble.tsx).
ExtractedPayment extractPayment(String content) {
  String? url;
  final markerIndex = content.indexOf(_paymentLinkMarker);
  if (markerIndex != -1) {
    final afterMarker = content.substring(markerIndex + _paymentLinkMarker.length).trim();
    final candidate = afterMarker.split(RegExp(r'\s')).first.replaceAll(RegExp(r'[.,)]$'), '');
    if (candidate.startsWith('http')) url = candidate;
  }
  url ??= _stripeUrlPattern.firstMatch(content)?.group(0);

  if (url == null) return ExtractedPayment(displayText: content);

  var displayText = content;
  if (content.contains(_paymentLinkMarker)) {
    final markerIdx = content.indexOf(_paymentLinkMarker);
    final before = content.substring(0, markerIdx).trimRight();
    final afterIdx = markerIdx + _paymentLinkMarker.length + url.length;
    final after = afterIdx <= content.length ? content.substring(afterIdx).trimLeft() : '';
    displayText = [before, after].where((s) => s.isNotEmpty).join('\n').trim();
  }

  return ExtractedPayment(displayText: displayText, paymentUrl: url);
}

class ChatPaymentButton extends StatelessWidget {
  final String url;

  const ChatPaymentButton({super.key, required this.url});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.green.withValues(alpha: 0.06),
        border: Border.all(color: Colors.green.withValues(alpha: 0.3)),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          const Row(
            children: [
              Icon(Icons.credit_card, color: Colors.green, size: 18),
              SizedBox(width: 8),
              Text('Secure Payment Ready', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'Tap below to complete your payment securely via Stripe. Link is valid for 24 hours.',
            style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.55), fontSize: 11.5),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green.shade700,
                foregroundColor: Colors.white,
              ),
              onPressed: () => launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication),
              icon: const Icon(Icons.credit_card, size: 16),
              label: const Text('Pay Now'),
            ),
          ),
        ],
      ),
    );
  }
}
