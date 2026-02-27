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