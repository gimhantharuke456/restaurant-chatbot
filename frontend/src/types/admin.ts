export interface AdminRestaurant {
  id: string;
  name: string;
  area: string;
  phone: string | null;
  email: string | null;
  cuisineTypes: string[];
  priceRange: "BUDGET" | "MODERATE" | "EXPENSIVE" | "FINE_DINING";
  avgRating: number | null;
  totalReviews: number;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  admin: { name: string | null; email: string };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminRestaurantDetail extends AdminRestaurant {
  description: string | null;
  address: string;
  website: string | null;
  openingHours: Record<string, string>;
  imageUrls: string[];
  reviews: AdminReview[];
  menuItems: MenuItem[];
}

export interface AdminReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: { name: string | null; email: string };
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  dietaryInfo: string[];
  isAvailable: boolean;
}

export type UserRole = "CUSTOMER" | "RESTAURANT_ADMIN" | "SYSTEM_ADMIN";

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: string;
  _count: {
    reservations: number;
    reviews: number;
    managedRestaurants: number;
  };
}

export interface AdminUserDetail extends AdminUser {
  reservations: Array<{
    id: string;
    date: string;
    time: string;
    status: string;
    restaurant: { name: string };
  }>;
  managedRestaurants: Array<{ id: string; name: string; isVerified: boolean }>;
}
