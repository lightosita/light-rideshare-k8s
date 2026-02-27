export type TripStatus = 'en_route' | 'in_progress' | 'arrived' | 'picked_up' | 'completed' | 'cancelled';

export interface Location {
  lat: number;
  lng: number;
}

export interface ActiveTripData {
  id: string;
  rideRequestId: string;
  status: TripStatus;
  riderName: string;
  riderPhone: string;        
  riderRating: number;
  pickupAddress: string;
  dropoffAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  driverLat?: number;
  driverLng?: number;
  estimatedFare?: number;
  distance?: number;
  estimatedTime?: string;
  paymentMethod?: string;
  driverName?: string;
  vehicleType?: string;
  driverInfo?: {
    licensePlate: string;
    carModel: string;
  };
}

export interface RideRequest {
  id: string;
  riderName: string;
  riderPhone: string;        
  riderRating: number;
  pickupAddress: string;
  dropoffAddress: string;
  estimatedFare: number;
  distance: number;
  duration: number;
  expiresAt: Date;
  riderId?: string;
  pickupLocation: Location;
  dropoffLocation: Location;
}

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
}

export interface DashboardData {
  driver_id: string;
  active_trip: any | null;
  earnings: {
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
  };
  recent_trips: any[];
  summary: {
    total_trips: number;
    total_earned: number;
    current_balance: number;
    average_rating: number;
  };
}

export interface Trip {
  id: number;
  trip_id: string;
  ride_request_id: string;
  status: 'accepted' | 'arrived' | 'started' | 'completed' | 'cancelled';
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

export interface EarningsData {
  summary: {
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
  };
  transactions: {
    driver_id: string;
    transactions: Array<{
      transaction_id: string;
      trip_id: string;
      amount: number;
      type: string;
      status: string;
      metadata: Record<string, any>;
      created_at: string;
    }>;
    pagination: {
      total: number;
      limit: number;
      offset: number;
      has_more: boolean;
    };
  };
}

export interface TripsResponse {
  driver_id: string;
  trips: Trip[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}
