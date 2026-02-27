export type VehicleType = 'SEDAN' | 'SUV' | 'VAN' | 'LUXURY' | 'ELECTRIC';


export type RideStatus = 
  | null 
  | 'searching' 
  | 'driver_assigned' 
  | 'matched' 
  | 'accepted' 
  | 'declined' 
  | 'driver_timeout' 
  | 'no_drivers';

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface RouteCoordinate {
  lat: number;
  lng: number;
}

export interface RouteInfo {
  distance: number; // in km
  duration: number; // in minutes
  fare: number;
  fareBreakdown: {
    base_fare: number;
    distance_fare: number;
    time_fare: number;
    surge_multiplier: number;
  };
}

// types/ride.ts (or wherever DriverInfo lives)

export interface RouteCoordinate {
  lat: number;
  lng: number;
  // add timestamp?: string; accuracy?: number; etc. if needed later
}

export interface DriverInfo {
  driver_id: string;
  driver_name?: string;
  firstName?: string;
  vehicle_type: VehicleType;
  license_plate: string;
  driver_rating: number;
  estimated_pickup_minutes: number;
  driver_location: RouteCoordinate | null;     // ← changed here
  phone_number?: string;
  total_rides?: number;
  years_experience?: number;
}

export interface RideRequest {
  id: string;
  userId: string;
  driverId?: string;
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
  status: 'pending' | 'accepted' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';
  fare_estimate: number;
  requested_vehicle_type: VehicleType;
  requested_at: Date;
}

export interface RideStatusUpdate {
  type: 'driver_location_update' | 'driver_arrived_pickup' | 'ride_started' | 'ride_completed';
  rideId: string;
  driverId: string;
  latitude?: number;
  longitude?: number;
  eta_minutes?: number;
  timestamp: Date;
}

export interface WebSocketMessage {
  event: string;
  data: any;
  timestamp: string;
}

export interface RideOffer {
  id: string;
  riderId: string;
  riderName: string;
  riderRating: number;
  riderPhone?: string;
  pickupAddress: string;
  dropoffAddress: string;
  estimatedFare: number;
  distance: number;
  duration: number;
  expiresAt: Date;
  pickupLocation: RouteCoordinate;
  dropoffLocation: RouteCoordinate;
}

// ADD THIS MISSING INTERFACE
export interface VehicleTypeConfig {
  id: VehicleType;
  name: string;
  icon: string;
  backendType: string;
  priceMultiplier: number;
  description?: string;
  capacity?: number;
  features?: string[];
}