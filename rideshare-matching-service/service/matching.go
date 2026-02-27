package service

import (
    "context"
    "encoding/json"
    "fmt"
    "log"
    "math"
    "rideshare-matching-service/models"
    "rideshare-matching-service/pool"
    "rideshare-matching-service/redis"
    "rideshare-matching-service/types"
    "strings"
    "time"
)

func round2(f float64) float64 {
    return float64(int(f*100+0.5)) / 100
}

func estimateDurationMinutes(km float64) int {
    return int(km/25*60 + 3) 
}

func processRideRequest(payload string) {
    log.Printf(">>> RAW REDIS PAYLOAD <<<: %s", payload)

    // First: parse the wrapper
    var wrapper struct {
        Data struct {
            RideRequestID string `json:"ride_request_id"`
            RiderID       string `json:"rider_id"`
            RiderName     string `json:"rider_name"`
            RiderRating   float64 `json:"rider_rating"`
            RiderPhone    string `json:"rider_phone"`

            PickupLocation struct {
                Lat     float64 `json:"lat"`
                Lng     float64 `json:"lng"`
                Address string  `json:"address"`
            } `json:"pickup_location"`

            DropoffLocation struct {
                Lat     float64 `json:"lat"`
                Lng     float64 `json:"lng"`
                Address string  `json:"address"`
            } `json:"dropoff_location"`

            VehicleType string  `json:"vehicle_type"`
            Fare        float64 `json:"fare"`
        } `json:"data"`
    }

    if err := json.Unmarshal([]byte(payload), &wrapper); err != nil {
        log.Printf("FAILED TO PARSE wrapper: %v", err)
        return
    }

    d := wrapper.Data // ← THIS IS THE REAL DATA

    log.Printf("PARSED RIDE SUCCESSFULLY → ID: %s | From: %s | To: %s | Fare: ₦%.0f | Pickup: (%.6f, %.6f)",
        d.RideRequestID,
        d.PickupLocation.Address,
        d.DropoffLocation.Address,
        d.Fare,
        d.PickupLocation.Lat,
        d.PickupLocation.Lng,
    )

    req := models.RideRequest{
        ID:             d.RideRequestID,
        RiderID:        d.RiderID,
        RiderName:      d.RiderName,
        RiderRating:    d.RiderRating,
        Pickup:         models.Location{Lat: d.PickupLocation.Lat, Lng: d.PickupLocation.Lng},
        Dropoff:        models.Location{Lat: d.DropoffLocation.Lat, Lng: d.DropoffLocation.Lng},
        PickupAddress:  d.PickupLocation.Address,
        DropoffAddress: d.DropoffLocation.Address,
        EstimatedFare:  d.Fare,
        VehicleType:    d.VehicleType,
    }

    saveRideRequestToRedis(&req)

    go broadcastRideToNearbyDrivers(req)
}

func saveRideRequestToRedis(req *models.RideRequest) {
    key := "ride:request:" + req.ID

    msg := models.RedisRideMessage{
        Event: "ride.requested",
        Data:  *req,
    }

    data, err := json.Marshal(msg)
    if err != nil {
        log.Printf("Failed to marshal ride request for Redis: %v", err)
        return
    }

    // Save for 10 minutes (more than enough)
    err = redis.Client.Set(ctx, key, data, 10*time.Minute).Err()
    if err != nil {
        log.Printf("Failed to save ride request to Redis: %v", err)
    } else {
        log.Printf("SAVED ride request %s to Redis", req.ID)
    }
}

func broadcastRideToNearbyDrivers(req models.RideRequest) {
    log.Printf("MATCHING: Looking for drivers near %f, %f for ride %s", req.Pickup.Lat, req.Pickup.Lng, req.ID)

    drivers := pool.Pool.ListOnline()

    var eligibleDrivers []*types.Driver
    for _, driver := range drivers {
        distance := haversineDistance(
            req.Pickup.Lat, req.Pickup.Lng,
            driver.Lat, driver.Lng,
        )

        if distance <= 5.0 {
            requestedType := strings.ToLower(req.VehicleType)
            driverType := strings.ToLower(driver.VehicleType)

            if driverType != requestedType {
                log.Printf("Driver %s EXCLUDED (Vehicle Mismatch). Requested: %s, Driver Has: %s",
                    driver.ID, requestedType, driverType)
            } else {
                eligibleDrivers = append(eligibleDrivers, driver)
                log.Printf("Driver %s is %.2f km away from pickup", driver.ID, distance)
            }
        }
    }

    if len(eligibleDrivers) == 0 {
        publishRideStatus(req.ID, req.RiderID, "no_drivers", nil, &req)
        return
    }

    log.Printf("Found %d drivers within range for ride %s", len(eligibleDrivers), req.ID)

    proposeRideToDriver(req, eligibleDrivers[0].ID)
}

func proposeRideToDriver(req models.RideRequest, driverID string) {
    driver, exists := pool.Pool.Get(driverID)
    if !exists || driver.Conn == nil {
        log.Printf("Driver %s not connected or missing WebSocket", driverID)
        return
    }

    distanceToPickup := haversineDistance(req.Pickup.Lat, req.Pickup.Lng, driver.Lat, driver.Lng)

    proposal := map[string]any{
        "event":        "ride.proposed",
        "distance_km":  round2(distanceToPickup),
        "duration_min": estimateDurationMinutes(distanceToPickup),
        "data": map[string]any{
            "ride_request_id": req.ID,
            "rider_id":        req.RiderID,
            "rider_name":      req.RiderName,
            "rider_rating":    req.RiderRating,
            "pickup_address":  req.PickupAddress,
            "dropoff_address": req.DropoffAddress,
            "pickup_location": req.Pickup,
            "dropoff_location": req.Dropoff,
            "estimated_fare":  req.EstimatedFare,
            "vehicle_type":    req.VehicleType,
        },
    }

    if err := driver.Conn.WriteJSON(proposal); err != nil {
        log.Printf("Failed to send proposal to driver %s: %v", driverID, err)
        pool.Pool.Remove(driverID)
    } else {
        log.Printf("PROPOSAL SENT → %s | %.2f km away | %s → %s | ₦%.0f",
            driverID,
            distanceToPickup,
            req.PickupAddress,
            req.DropoffAddress,
            req.EstimatedFare,
        )
    }
}

func getRideRequestData(rideID string) (*models.RideRequest, error) {
    key := getRideRequestKey(rideID)
    data, err := redis.Client.Get(ctx, key).Result()
    if err != nil {
        if err.Error() == "redis: nil" {
            return nil, fmt.Errorf("ride request ID %s not found in Redis", rideID)
        }
        return nil, err
    }

    var req models.RedisRideMessage
    if err := json.Unmarshal([]byte(data), &req); err != nil {
        return nil, fmt.Errorf("failed to unmarshal ride request JSON: %w", err)
    }

    return &req.Data, nil
}

func AcceptRide(rideID, driverID string) {
    log.Printf("SERVICE: Incoming POST /api/v1/ride/accept | Ride: %s, Driver: %s attempting to claim.", rideID, driverID)

    acceptanceKey := getRideAcceptanceKey(rideID)

    accepted, err := redis.Client.SetNX(ctx, acceptanceKey, driverID, 24*time.Hour).Result()

    if err != nil {
        log.Printf("REDIS ERROR claiming ride %s: %v", rideID, err)
        return
    }

    if !accepted {
        log.Printf("RIDE ALREADY ACCEPTED: Ride %s already claimed.", rideID)
        return
    }

    requestData, err := getRideRequestData(rideID)
    if err != nil {
        log.Printf("CRITICAL: Failed to retrieve ride request data for %s: %v", rideID, err)
        return
    }

    pool.Pool.SetAvailability(driverID, false)

    driver, _ := pool.Pool.Get(driverID)
    publishRideStatus(rideID, "", "accepted", driver, requestData)

    log.Printf("RIDE ACCEPTED: Ride %s successfully assigned to driver %s. Trip creation event published.", rideID, driverID)
}

func autoCancelRideIfNotAccepted(rideID, requestKey string) {
    log.Printf("Starting 30s timeout for ride %s...", rideID)

    bgCtx := context.Background()
    time.Sleep(30 * time.Second)

    acceptanceKey := getRideAcceptanceKey(rideID)
    exists, err := redis.Client.Exists(bgCtx, acceptanceKey).Result()

    if err == nil && exists > 0 {
        log.Printf("Ride %s was accepted. Stopping timeout procedure.", rideID)
        return
    }

    log.Printf("Ride %s timed out - no driver accepted", rideID)

    requestData, dataErr := getRideRequestData(rideID)

    publishRideStatus(rideID, "", "timed_out", nil, requestData)

    if dataErr == nil {
        redis.Client.Del(bgCtx, requestKey)
    }

    log.Printf("Ride %s cleanup complete.", rideID)
}

func publishRideStatus(rideID, riderID, status string, driver *types.Driver, requestData *models.RideRequest) {
    log.Printf("Publishing ride status for %s: %s", rideID, status)

    var defaultRequestData models.RideRequest
    if requestData == nil {
        log.Printf("WARNING: Missing RideRequest data for status %s. Using default values.", status)
        requestData = &defaultRequestData
    }

    var driverInfo map[string]any
    if driver != nil {
        driverInfo = map[string]any{
            "name":           driver.FirstName,              // ← changed to "name" to match Python expectation
            "phone":          driver.PhoneNumber,            // ← assuming types.Driver has this field; add if missing
            "rating":         driver.Rating,
            "vehicle_model":  driver.VehicleModel,           // ← if not in types.Driver, leave "" or fetch
            "vehicle_plate":  driver.LicensePlate,
            "id":             driver.ID,
            "driver_location": map[string]float64{
                "lat": driver.Lat,
                "lng": driver.Lng,
            },
        }
    } else {
        driverInfo = map[string]any{
            "name":          "Unknown Driver",
            "phone":         "",
            "rating":        4.8,
            "vehicle_model": "",
            "vehicle_plate": "",
        }
    }

    finalRiderID := riderID
    if requestData.RiderID != "" {
        finalRiderID = requestData.RiderID
    }

    payload := map[string]any{
        "event":           "ride." + status,
        "ride_request_id": rideID,
        "rider_id":        finalRiderID,
        "rider_name":      requestData.RiderName,
        "rider_phone":     requestData.RiderPhone,
        "rider_rating":    requestData.RiderRating,
        "status":          status,
        "driverInfo":      driverInfo,
        "pickup": map[string]any{
            "lat":     requestData.Pickup.Lat,
            "lng":     requestData.Pickup.Lng,
            "address": requestData.PickupAddress,
        },
        "dropoff": map[string]any{
            "lat":     requestData.Dropoff.Lat,
            "lng":     requestData.Dropoff.Lng,
            "address": requestData.DropoffAddress,
        },
        "vehicle_type":   requestData.VehicleType,
        "estimated_fare": requestData.EstimatedFare,
    }

    data, err := json.Marshal(payload)
    if err != nil {
        log.Printf("Failed to marshal ride status payload: %v", err)
        return
    }

    redis.Client.Publish(ctx, "ride_request_events", data)
    log.Printf("SUCCESS: Published ride.%s event to ride_request_events channel", status)
}

func haversineDistance(lat1, lon1, lat2, lon2 float64) float64 {
    const R = 6371

    var (
        latRad1 = lat1 * math.Pi / 180
        lonRad1 = lon1 * math.Pi / 180
        latRad2 = lat2 * math.Pi / 180
        lonRad2 = lon2 * math.Pi / 180
    )

    dLat := latRad2 - latRad1
    dLon := lonRad2 - lonRad1

    a := math.Sin(dLat/2)*math.Sin(dLat/2) +
        math.Cos(latRad1)*math.Cos(latRad2)*
            math.Sin(dLon/2)*math.Sin(dLon/2)

    c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
    return R * c
}

func getRideRequestKey(rideID string) string {
    return "ride:request:" + rideID
}

func getRideAcceptanceKey(rideID string) string {
    return "ride:accepted:" + rideID
}