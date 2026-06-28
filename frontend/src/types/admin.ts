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

export type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";

export interface AdminPayment {
  id: string;
  amount: number;
  currency: string;
  stripePaymentId: string | null;
  receiptUrl: string | null;
  status: PaymentStatus;
  createdAt: string;
  user: { name: string | null; email: string };
  reservation: {
    id: string;
    date: string;
    time: string;
    restaurant: { name: string };
  };
}

export interface PaymentSummaryStats {
  totalRevenue: number;
  succeeded: number;
  failed: number;
  refunded: number;
}

export type ReservationStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW";

export interface AdminReservation {
  id: string;
  date: string;
  time: string;
  partySize: number;
  specialRequests: string | null;
  status: ReservationStatus;
  createdAt: string;
  user: { id: string; name: string | null; email: string };
  restaurant: { id: string; name: string; area: string };
  payment: { status: string; amount: number } | null;
  review: { id: string; rating: number; comment: string | null; imageUrls: string; createdAt: string } | null;
}

export interface TimeSeriesPoint {
  date: string;
  count?: number;
  amount?: number;
}

export interface CuisinePoint {
  cuisine: string;
  count: number;
}

export interface StatusPoint {
  status: string;
  count: number;
}

export interface AnalyticsData {
  reservationsTrend: TimeSeriesPoint[];
  revenueTrend: TimeSeriesPoint[];
  cuisinePopularity: CuisinePoint[];
  userGrowth: TimeSeriesPoint[];
  reservationStatus: StatusPoint[];
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


export interface SystemSettings {
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  maxReservationsPerDay: number;
  supportEmail: string;
  ngrokUrl: string | null;
}

export interface AuditLog {
  id: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string | null;
  details: string | null;
  createdAt: string;
  ipAddress: string | null;
}
