class ComplaintModel {
  final String id;
  final String subject;
  final String description;
  final String status;
  final String? adminNote;
  final DateTime createdAt;

  const ComplaintModel({
    required this.id,
    required this.subject,
    required this.description,
    required this.status,
    required this.createdAt,
    this.adminNote,
  });

  factory ComplaintModel.fromJson(Map<String, dynamic> json) {
    return ComplaintModel(
      id: json['id'] as String,
      subject: json['subject'] as String,
      description: json['description'] as String,
      status: json['status'] as String? ?? 'OPEN',
      adminNote: json['adminNote'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}
