import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/motion/entrance.dart';
import '../../../core/motion/skeleton_loader.dart';
import '../../../core/theme/app_colors.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/dining_preferences_model.dart';
import '../providers/profile_provider.dart';
import '../widgets/choice_chip_group.dart';

const _cuisineOptions = [
  'Sri Lankan', 'Japanese', 'Italian', 'Indian', 'Chinese', 'Thai', 'Seafood', 'BBQ',
  'Burger', 'Pizza', 'Sushi', 'Vegetarian', 'Mediterranean', 'French', 'Mexican',
];
const _dietaryOptions = ['Vegetarian', 'Vegan', 'Halal', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Kosher'];
const _seatingOptions = ['Indoor', 'Outdoor', 'Bar', 'Booth', 'High-Top', 'Private Room'];
const _budgetLabels = {
  'BUDGET': 'Budget',
  'MODERATE': 'Moderate',
  'EXPENSIVE': 'Expensive',
  'FINE_DINING': 'Fine Dining',
};

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  late final TextEditingController _nameController;
  late final TextEditingController _phoneController;
  List<String> _cuisines = [];
  List<String> _dietary = [];
  List<String> _seating = [];
  String? _budget;
  bool _prefsInitialized = false;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthProvider>().currentUser;
    _nameController = TextEditingController(text: user?.name ?? '');
    _phoneController = TextEditingController(text: user?.phone ?? '');
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await context.read<ProfileProvider>().loadPreferences();
      if (!mounted) return;
      final prefs = context.read<ProfileProvider>().preferences;
      setState(() {
        _cuisines = List.of(prefs.cuisines);
        _dietary = List.of(prefs.dietaryRestrictions);
        _seating = List.of(prefs.seatingPreferences);
        _budget = prefs.budgetPreference;
        _prefsInitialized = true;
      });
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    final messenger = ScaffoldMessenger.of(context);
    final authProvider = context.read<AuthProvider>();
    try {
      final user = await context.read<ProfileProvider>().saveProfile(
            name: _nameController.text.trim(),
            phone: _phoneController.text.trim(),
          );
      authProvider.updateLocalUser(user);
      messenger.showSnackBar(const SnackBar(content: Text('Profile saved')));
    } catch (_) {
      messenger.showSnackBar(const SnackBar(content: Text('Failed to save profile. Please try again.')));
    }
  }

  Future<void> _savePreferences() async {
    final messenger = ScaffoldMessenger.of(context);
    final ok = await context.read<ProfileProvider>().savePreferences(DiningPreferencesModel(
          cuisines: _cuisines,
          dietaryRestrictions: _dietary,
          budgetPreference: _budget,
          seatingPreferences: _seating,
        ));
    messenger.showSnackBar(SnackBar(
      content: Text(ok ? 'Preferences saved' : 'Failed to save preferences. Please try again.'),
    ));
  }

  Future<void> _confirmSignOut() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Sign out?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Sign out')),
        ],
      ),
    );
    if (confirmed == true && mounted) {
      await context.read<AuthProvider>().signOut();
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().currentUser;
    final profileProvider = context.watch<ProfileProvider>();

    return Scaffold(
      appBar: AppBar(title: const Text('Profile & Preferences')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          staggeredEntrance(
            _AccountCard(
              email: user?.email ?? '',
              nameController: _nameController,
              phoneController: _phoneController,
              isSaving: profileProvider.isSavingProfile,
              onSave: _saveProfile,
            ),
            index: 0,
          ),
          const SizedBox(height: 24),
          Text('Dining Preferences', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 12),
          if (profileProvider.isLoadingPreferences && !_prefsInitialized)
            const SkeletonLoader(height: 220, borderRadius: BorderRadius.all(Radius.circular(14)))
          else ...[
            staggeredEntrance(
              ChoiceChipGroup(
                label: 'Preferred Cuisines',
                options: _cuisineOptions,
                selected: _cuisines,
                onChanged: (v) => setState(() => _cuisines = v),
              ),
              index: 1,
            ),
            const SizedBox(height: 16),
            staggeredEntrance(
              ChoiceChipGroup(
                label: 'Dietary Restrictions',
                options: _dietaryOptions,
                selected: _dietary,
                onChanged: (v) => setState(() => _dietary = v),
              ),
              index: 2,
            ),
            const SizedBox(height: 16),
            staggeredEntrance(
              _BudgetSelector(value: _budget, onChanged: (v) => setState(() => _budget = v)),
              index: 3,
            ),
            const SizedBox(height: 16),
            staggeredEntrance(
              ChoiceChipGroup(
                label: 'Seating Preferences',
                options: _seatingOptions,
                selected: _seating,
                onChanged: (v) => setState(() => _seating = v),
              ),
              index: 4,
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: profileProvider.isSavingPreferences ? null : _savePreferences,
                child: Text(profileProvider.isSavingPreferences ? 'Saving…' : 'Save Preferences'),
              ),
            ),
          ],
          const SizedBox(height: 32),
          OutlinedButton.icon(
            onPressed: _confirmSignOut,
            icon: const Icon(Icons.logout, color: AppColors.destructive),
            label: const Text('Sign Out', style: TextStyle(color: AppColors.destructive)),
          ),
        ],
      ),
    );
  }
}

class _AccountCard extends StatelessWidget {
  final String email;
  final TextEditingController nameController;
  final TextEditingController phoneController;
  final bool isSaving;
  final VoidCallback onSave;

  const _AccountCard({
    required this.email,
    required this.nameController,
    required this.phoneController,
    required this.isSaving,
    required this.onSave,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Account details', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
            const SizedBox(height: 12),
            Text(email, style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.55))),
            const SizedBox(height: 12),
            TextField(
              controller: nameController,
              decoration: const InputDecoration(labelText: 'Full name'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: phoneController,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'Phone number'),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: isSaving ? null : onSave,
                child: Text(isSaving ? 'Saving…' : 'Save changes'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BudgetSelector extends StatelessWidget {
  final String? value;
  final ValueChanged<String?> onChanged;

  const _BudgetSelector({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Budget Preference', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
        const SizedBox(height: 8),
        DropdownButtonFormField<String?>(
          initialValue: value,
          hint: const Text('No preference'),
          items: [
            const DropdownMenuItem<String?>(value: null, child: Text('No preference')),
            ..._budgetLabels.entries.map((e) => DropdownMenuItem<String?>(value: e.key, child: Text(e.value))),
          ],
          onChanged: onChanged,
        ),
      ],
    );
  }
}
