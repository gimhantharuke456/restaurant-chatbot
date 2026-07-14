class UserModel {
  final String id;
  final String firebaseUid;
  final String email;
  final String? name;
  final String? phone;
  final String? avatarUrl;
  final String role;

  const UserModel({
    required this.id,
    required this.firebaseUid,
    required this.email,
    required this.role,
    this.name,
    this.phone,
    this.avatarUrl,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as String,
      firebaseUid: json['firebaseUid'] as String,
      email: json['email'] as String,
      name: json['name'] as String?,
      phone: json['phone'] as String?,
      avatarUrl: json['avatarUrl'] as String?,
      role: json['role'] as String,
    );
  }
}
