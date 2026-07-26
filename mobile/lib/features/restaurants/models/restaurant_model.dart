class RestaurantModel {
  final String id;
  final String name;
  final String? description;
  final String address;
  final String area;
  final String? phone;
  final String? website;
  final List<String> cuisineTypes;
  final String priceRange;
  final Map<String, dynamic>? openingHours;
  final List<String> imageUrls;
  final String? profileImageUrl;
  final String? coverImageUrl;
  final bool isVerified;
  final double? avgRating;
  final int totalReviews;
  final double? latitude;
  final double? longitude;
  final int? totalSeats;

  const RestaurantModel({
    required this.id,
    required this.name,
    required this.address,
    required this.area,
    required this.cuisineTypes,
    required this.priceRange,
    required this.imageUrls,
    required this.isVerified,
    required this.totalReviews,
    this.description,
    this.phone,
    this.website,
    this.openingHours,
    this.profileImageUrl,
    this.coverImageUrl,
    this.avgRating,
    this.latitude,
    this.longitude,
    this.totalSeats,
  });

  factory RestaurantModel.fromJson(Map<String, dynamic> json) {
    return RestaurantModel(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      address: json['address'] as String,
      area: json['area'] as String,
      phone: json['phone'] as String?,
      website: json['website'] as String?,
      cuisineTypes: List<String>.from(json['cuisineTypes'] as List? ?? const []),
      priceRange: json['priceRange'] as String,
      openingHours: json['openingHours'] as Map<String, dynamic>?,
      imageUrls: List<String>.from(json['imageUrls'] as List? ?? const []),
      profileImageUrl: json['profileImageUrl'] as String?,
      coverImageUrl: json['coverImageUrl'] as String?,
      isVerified: json['isVerified'] as bool? ?? false,
      avgRating: (json['avgRating'] as num?)?.toDouble(),
      totalReviews: json['totalReviews'] as int? ?? 0,
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      totalSeats: json['totalSeats'] as int?,
    );
  }
}

class RestaurantPage {
  final List<RestaurantModel> data;
  final int total;
  final int page;
  final int limit;

  const RestaurantPage({
    required this.data,
    required this.total,
    required this.page,
    required this.limit,
  });

  factory RestaurantPage.fromJson(Map<String, dynamic> json) {
    return RestaurantPage(
      data: (json['data'] as List)
          .map((e) => RestaurantModel.fromJson(e as Map<String, dynamic>))
          .toList(),
      total: json['total'] as int,
      page: json['page'] as int,
      limit: json['limit'] as int,
    );
  }
}
