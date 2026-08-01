import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:provider/provider.dart';
import '../../../core/motion/app_motion.dart';
import '../providers/auth_provider.dart';

const _cuisineOptions = [
  'Sri Lankan', 'Japanese', 'Italian', 'Indian', 'Chinese', 'Thai', 'Seafood', 'BBQ',
  'Burger', 'Pizza', 'Sushi', 'Vegetarian', 'Mediterranean', 'French', 'Mexican',
];
const _languageOptions = ['English', 'Sinhala', 'Tamil'];
const _budgetOptions = {
  'BUDGET': 'Budget',
  'MODERATE': 'Moderate',
  'EXPENSIVE': 'Expensive',
  'FINE_DINING': 'Fine Dining',
};

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _phoneController = TextEditingController();
  DateTime? _dateOfBirth;
  String? _preferredLanguage;
  final List<String> _cuisines = [];
  String? _budgetPreference;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _pickDateOfBirth() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime(now.year - 25),
      firstDate: DateTime(now.year - 100),
      lastDate: now,
    );
    if (picked != null) setState(() => _dateOfBirth = picked);
  }

  Future<void> _submit(AuthProvider auth) async {
    if (!_formKey.currentState!.validate()) return;
    await auth.register(
      _emailController.text.trim(),
      _passwordController.text,
      _nameController.text.trim(),
      extras: {
        if (_phoneController.text.trim().isNotEmpty) 'phone': _phoneController.text.trim(),
        if (_dateOfBirth != null) 'dateOfBirth': _dateOfBirth!.toUtc().toIso8601String(),
        if (_preferredLanguage != null) 'preferredLanguage': _preferredLanguage,
        if (_cuisines.isNotEmpty) 'cuisines': _cuisines,
        if (_budgetPreference != null) 'budgetPreference': _budgetPreference,
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      appBar: AppBar(title: const Text('Create account')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextFormField(
                  key: const Key('register_name_field'),
                  controller: _nameController,
                  decoration: const InputDecoration(labelText: 'Full name'),
                  validator: (value) =>
                      (value == null || value.isEmpty) ? 'Name is required' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  key: const Key('register_email_field'),
                  controller: _emailController,
                  decoration: const InputDecoration(labelText: 'Email'),
                  keyboardType: TextInputType.emailAddress,
                  validator: (value) =>
                      (value == null || value.isEmpty) ? 'Email is required' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  key: const Key('register_password_field'),
                  controller: _passwordController,
                  decoration: const InputDecoration(labelText: 'Password (min 6 characters)'),
                  obscureText: true,
                  validator: (value) => (value == null || value.length < 6)
                      ? 'Password must be at least 6 characters'
                      : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _phoneController,
                  decoration: const InputDecoration(labelText: 'Phone number (optional)'),
                  keyboardType: TextInputType.phone,
                ),
                const SizedBox(height: 12),
                OutlinedButton(
                  onPressed: _pickDateOfBirth,
                  child: Text(
                    _dateOfBirth == null
                        ? 'Date of birth (optional)'
                        : '${_dateOfBirth!.day}/${_dateOfBirth!.month}/${_dateOfBirth!.year}',
                  ),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: _preferredLanguage,
                  decoration: const InputDecoration(labelText: 'Preferred language (optional)'),
                  items: _languageOptions
                      .map((l) => DropdownMenuItem(value: l, child: Text(l)))
                      .toList(),
                  onChanged: (v) => setState(() => _preferredLanguage = v),
                ),
                const SizedBox(height: 12),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text('Preferred cuisines (optional)', style: Theme.of(context).textTheme.labelMedium),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _cuisineOptions.map((c) {
                    final selected = _cuisines.contains(c);
                    return FilterChip(
                      label: Text(c),
                      selected: selected,
                      onSelected: (v) => setState(() => v ? _cuisines.add(c) : _cuisines.remove(c)),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: _budgetPreference,
                  decoration: const InputDecoration(labelText: 'Budget preference (optional)'),
                  items: _budgetOptions.entries
                      .map((e) => DropdownMenuItem(value: e.key, child: Text(e.value)))
                      .toList(),
                  onChanged: (v) => setState(() => _budgetPreference = v),
                ),
                if (auth.error != null) ...[
                  const SizedBox(height: 12),
                  Text(auth.error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                ],
                const SizedBox(height: 20),
                ElevatedButton(
                  key: const Key('register_submit_button'),
                  onPressed: auth.isLoading ? null : () => _submit(auth),
                  child: auth.isLoading
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Create account'),
                ),
              ],
            ).animate().fadeIn(duration: AppMotion.emphasized, curve: AppMotion.emphasizedCurve)
                .slideY(begin: 0.08, end: 0, duration: AppMotion.emphasized, curve: AppMotion.emphasizedCurve),
          ),
        ),
      ),
    );
  }
}
