package models

type Location struct {
	Lat float64 `json:"lat"` 
	Lng float64 `json:"lng"`
	
}

type Driver struct {
	ID          string  `json:"id"`
	FirstName   string  `json:"firstName"`
	Location    Location `json:"location"`
	VehicleType string  `json:"vehicle_type"`
	Rating      float64 `json:"rating"`
}


type RideRequest struct {

	ID              string  `json:"ride_request_id"` 
	RiderID         string  `json:"rider_id"`
	RiderName       string  `json:"rider_name"` 
	RiderPhone      string  `json:"rider_phone"` 
	RiderRating     float64 `json:"rider_rating"` 
	
	Pickup          Location `json:"pickup_location"`
	Dropoff         Location `json:"dropoff_location"`
	

	PickupAddress   string  `json:"pickup_address"` 
	DropoffAddress  string  `json:"dropoff_address"`
	
	EstimatedFare   float64 `json:"estimated_fare"` 
	VehicleType     string  `json:"vehicle_type"`
	
	EstimatedDistanceKm float64 `json:"estimated_distance_km"` 
	EstimatedDurationMin float64 `json:"estimated_duration_min"` 
}

type RedisRideMessage struct {
	Event string `json:"event"`
	Data RideRequest `json:"data"` 
}