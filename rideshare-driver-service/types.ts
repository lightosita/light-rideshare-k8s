export interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  passwordHash: string;
  licenseNumber: string;
  vehicleType: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  licensePlate: string;
  rating: number;
  totalTrips: number;
  isAvailable: boolean;
  isVerified: boolean;
  isActive: boolean;
  verificationToken: string | null;
  resetToken: string | null;
  resetTokenExpiry: Date | null;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDriverInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  passwordHash: string;
  licenseNumber: string;
  vehicleType: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  licensePlate: string;
  verificationToken: string;
}

export interface DriverLocation {
  id: string;
  driverId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speedKmh?: number;
  updatedAt: Date;
}

export interface Trip {
  trip_id: string;
  ride_request_id: string;
  status: string;
  rider_id: string;
  driver_id: string;
  pickup_address?: string;
  dropoff_address?: string;
  vehicle_type?: string;
  estimated_fare?: number;
  actual_fare?: number;
  distance_km?: number;
  duration_minutes?: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  rider: {
    name?: string;
    phone?: string;
    rating?: number;
  };
  payment?: {
    status?: string;
    driver_amount?: number;
    commission?: number;
    processed_at?: string;
  };
}

export interface DriverEarningsSummary {
  driver_id: string;
  time_range: string;
  statistics: {
    total_trips: number;
    total_earned: number;
    driver_earned: number;
    total_commission: number;
    average_fare: number;
    average_driver_earned: number;
    first_payment?: string;
    last_payment?: string;
  };
  account: {
    current_balance: number;
    total_earnings: number;
    last_payment_date?: string;
  };
  recent_trips: Array<{
    trip_id: string;
    total_fare: number;
    driver_earned: number;
    commission: number;
    paid_at?: string;
    rider_name?: string;
    distance_km: number;
    duration_minutes: number;
  }>;
}

export interface Transaction {
  transaction_id: string;
  trip_id: string;
  amount: number;
  type: string;
  status: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface TripPagination {
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface DriverTripsResponse {
  driver_id: string;
  trips: Trip[];
  pagination: TripPagination;
}

export interface DriverEarningsResponse {
  summary: DriverEarningsSummary;
  transactions: {
    driver_id: string;
    transactions: Transaction[];
    pagination: TripPagination;
  };
}

export interface TripServiceOptions {
  status?: string;
  limit?: number;
  offset?: number;
  includeCancelled?: boolean;
  timeRange?: string;
}