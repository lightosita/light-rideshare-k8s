package types

import (
    "sync" // <-- ADD THIS IMPORT
    "github.com/gorilla/websocket"
)

// Driver represents an active, authenticated driver connection and state
type Driver struct {
    ID              string  `json:"id"`
    
    // --- Identity & Display Fields ---
    FirstName       string  `json:"firstName"`
    LastName        string  `json:"lastName"`
    LicensePlate    string  `json:"licensePlate"`
    PhoneNumber     string   `json:"PhoneNumber"`
    
    // --- Vehicle Details ---
    VehicleType     string  `json:"vehicleType"`
    VehicleMake     string  `json:"vehicleMake"`
    VehicleModel    string  `json:"vehicleModel"`
    VehicleYear     string  `json:"vehicleYear"`

    // --- Status & Location Fields ---
    Lat             float64 `json:"lat"`
    Lng             float64 `json:"lng"`
    Rating          float64 `json:"rating"`
    TotalTrips      int     `json:"totalTrips"`
    IsAvailable     bool    `json:"isAvailable"`
    FareEstimate     int     `json:"fareEstimate"`
    // Additional field for WebSocket connection
    Conn            *WebSocketConnection // This now refers to the type defined below
}

// WebSocketConnection defines the structure for holding the connection details 
// and methods required for sending messages to a driver.
type WebSocketConnection struct {
    // Hold the actual connection pointer
    Conn *websocket.Conn // <-- CRITICAL FIX: Use the actual imported type
    
    // Mutex to safely handle concurrent writes to the connection
    Mu sync.Mutex 
    
    // Optional: DriverID or other metadata
}

// WriteJSON implements the necessary method for sending messages.
// This resolves the "driver.Conn.WriteJSON undefined" errors.
func (c *WebSocketConnection) WriteJSON(v interface{}) error {
    c.Mu.Lock()
    defer c.Mu.Unlock()
    
    // Use the underlying gorilla connection to write the JSON message
    return c.Conn.WriteJSON(v)
}

type DriverLocationEvent struct {
    DriverID        string  `json:"driverID"`
    Lat             float64 `json:"lat"`
    Lng             float64 `json:"lng"`
    VehicleType     string  `json:"vehicleType"`
    Rating          float64 `json:"rating"`
    IsAvailable     bool    `json:"isAvailable"`
}