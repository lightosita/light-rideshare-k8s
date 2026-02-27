export interface TripData {
  id: string;
  ride_request_id: string;
  status: string;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_address: string;
  dropoff_lat: number;
  dropoff_lng: number;
  estimated_fare: number;
  rider_info: {
    id: string;
    name: string;
    phone: string | null;
    rating: number;
  };
}