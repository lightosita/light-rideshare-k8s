
package service

import (
    "context"
    "encoding/json"
    "log"
    "strconv"

    "rideshare-matching-service/pool"
    "rideshare-matching-service/redis"
    
)

var ctx = context.Background()

func StartServiceListener() {
    pubsub := redis.Client.Subscribe(ctx,
        "ride.requested",
        "driver.location_updated",
    )
    defer pubsub.Close()

    if _, err := pubsub.Receive(ctx); err != nil {
        log.Fatalf("Redis subscription failed: %v", err)
    }

    log.Println("Service Listener subscribed to Redis channels: ride.requested, driver.location_updated")

    for msg := range pubsub.Channel() {
        log.Printf("SERVICE: Received Redis message | Channel: %s", msg.Channel)

        switch msg.Channel {
        case "ride.requested":
            go processRideRequest(msg.Payload)

        case "driver.location_updated":
            go processDriverLocationUpdate(msg.Payload)
        }
    }
}

func processDriverLocationUpdate(payload string) {
    var success bool

    // Try Format 1: { "data": { "driver_id": "...", "location": { "latitude": "6.5", "longitude": "3.3" }, ... } }
    var event1 struct {
        Data struct {
            DriverID    string `json:"driver_id"`
            IsAvailable bool   `json:"is_available"`
            Location    struct {
                Latitude  string `json:"latitude"`
                Longitude string `json:"longitude"`
            } `json:"location"`
            DriverInfo struct {
                VehicleType string  `json:"vehicle_type"`
                Rating      float64 `json:"rating"`
            } `json:"driver_info"`
        } `json:"data"`
    }

    if err := json.Unmarshal([]byte(payload), &event1); err == nil && event1.Data.DriverID != "" {
        lat, latErr := strconv.ParseFloat(event1.Data.Location.Latitude, 64)
        lng, lngErr := strconv.ParseFloat(event1.Data.Location.Longitude, 64)

        if latErr == nil && lngErr == nil {
            updateDriverInPool(event1.Data.DriverID, lat, lng, event1.Data.IsAvailable)
            success = true
        }
    }

    // Try Format 2 & 3: direct or nested with float coordinates
    if !success {
        var driverID string
        var lat, lng float64
        var isAvailable bool

        // Generic unmarshal to extract common fields
        var generic map[string]interface{}
        if json.Unmarshal([]byte(payload), &generic) == nil {
            // Extract driver_id
            if data, ok := generic["data"].(map[string]interface{}); ok {
                driverID = extractString(data, "driver_id")
            } else {
                driverID = extractString(generic, "driver_id")
            }

            if driverID == "" {
                log.Printf("No driver_id found in payload: %s", payload)
                return
            }

            // Extract location
            var loc map[string]interface{}
            if data, ok := generic["data"].(map[string]interface{}); ok && data["location"] != nil {
                loc = data["location"].(map[string]interface{})
            } else if generic["location"] != nil {
                loc = generic["location"].(map[string]interface{})
            }

            if loc != nil {
                lat = extractFloat(loc, "latitude")
                lng = extractFloat(loc, "longitude")
            }

            // Extract is_available
            if data, ok := generic["data"].(map[string]interface{}); ok {
                if avail, ok := data["is_available"].(bool); ok {
                    isAvailable = avail
                }
            }

            if lat != 0 && lng != 0 {
                updateDriverInPool(driverID, lat, lng, isAvailable)
                success = true
            }
        }
    }

    if !success {
        log.Printf("Failed to parse driver.location_updated payload: %s", payload)
    }
}

// Helper: safely extract string
func extractString(m map[string]interface{}, key string) string {
    if val, ok := m[key].(string); ok {
        return val
    }
    return ""
}

// Helper: safely extract float64
func extractFloat(m map[string]interface{}, key string) float64 {
    if val, ok := m[key].(float64); ok {
        return val
    }
    if str, ok := m[key].(string); ok {
        if f, err := strconv.ParseFloat(str, 64); err == nil {
            return f
        }
    }
    return 0
}

// This uses the REAL methods that exist in your pool: UpdateLocation + SetAvailability
func updateDriverInPool(driverID string, lat, lng float64, isAvailable bool) {
    if driverID == "" {
        log.Println("Rejecting driver update with empty DriverID")
        return
    }

    log.Printf("SERVICE: Updating driver %s → Location: (%.6f, %.6f) | Available: %t", driverID, lat, lng, isAvailable)

    // Update location (this method EXISTS in your pool)
    pool.Pool.UpdateLocation(driverID, lat, lng)

    // Update availability (this method also EXISTS)
    pool.Pool.SetAvailability(driverID, isAvailable)
}