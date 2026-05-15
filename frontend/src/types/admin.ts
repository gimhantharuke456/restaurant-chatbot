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
