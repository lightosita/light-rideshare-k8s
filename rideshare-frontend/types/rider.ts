export interface RiderTrip {
  trip_id: string;
  ride_request_id: string;
  status: 'pending' | 'accepted' | 'arrived' | 'started' | 'completed' | 'cancelled';
  driver_id: string;
  driver_name?: string;
  driver_phone?: string;
  driver_rating?: number;
  vehicle_model?: string;
  vehicle_plate?: string;
  pickup_address: string;
  dropoff_address: string;
  estimated_fare: number;
  actual_fare?: number;
  distance_km?: number;
  duration_minutes?: number;
  requested_at: string;
  accepted_at?: string;
  arrived_at?: string;
  started_at?: string;
  completed_at?: string;
  payment_status?: 'pending' | 'paid' | 'failed';
}

export interface RiderTripHistoryResponse {
  trips: RiderTrip[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

export interface TripStatistics {
  total_trips: number;
  completed_trips: number;
  cancelled_trips: number;
  total_spent: number;
  average_driver_rating: number;
  most_used_vehicle_type: string;
  total_distance_km: number;
}

export interface DashboardData {
  rider_id: string;
  recent_trips: RiderTrip[];
  statistics: {
    total_trips: number;
    completed_trips: number;
    total_spent: number;
    total_distance_km: number;
    average_trip_cost: number;
  };
  upcoming_features: {
    scheduled_rides: number;
    favorite_drivers: number;
    saved_locations: number;
  };
}

export interface RideRequestData {
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string;
  dropoff_lat: number;
  dropoff_lng: number;
  dropoff_address: string;
  vehicle_type?: string;
  fare: number;
}

export interface RideRequestResponse {
  success: boolean;
  message: string;
  data: {
    rideRequestId: string;
    status: 'PENDING_MATCHING';
    pickup: {
      lat: number;
      lng: number;
      address: string;
    };
    dropoff: {
      lat: number;
      lng: number;
      address: string;
    };
    fare: number;
  };
}