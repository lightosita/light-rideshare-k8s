package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"rideshare-matching-service/redis"
	"rideshare-matching-service/models" 
	"rideshare-matching-service/service" // ⬅️ NEW: Import the service package
)

// --- Helper: Load Ride Request from Redis ---
// Fetches the full RideRequest object from Redis using the ride ID.
func loadRideRequest(rideID string) (*models.RideRequest, error) {
	// FIX: Corrected key format to match 'ride:request:ID' used in service.go
	key := fmt.Sprintf("ride:request:%s", rideID) 
	
	val, err := redis.Client.Get(context.Background(), key).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to fetch ride request %s from Redis: %w", rideID, err)
	}

	var request models.RideRequest 
	if err := json.Unmarshal([]byte(val), &request); err != nil {
		return nil, fmt.Errorf("failed to unmarshal ride request JSON: %w", err)
	}

	return &request, nil
}

func HandleDriverAcceptance(rideID string, driverID string) {
	log.Printf("INFO: HandleDriverAcceptance called for Ride: %s, Driver: %s. Delegating to core service logic.", rideID, driverID)
	
	_, err := loadRideRequest(rideID) 
	if err != nil {
		log.Printf("ERROR: Could not load ride request data for trip creation: %v", err)
		return
	}

	service.AcceptRide(rideID, driverID) 
	
	log.Printf("SUCCESS: Acceptance acknowledged in worker. Core service acceptance initiated.")
}