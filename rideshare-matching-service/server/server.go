package server

import (
    "context"
    "database/sql"
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "sync"

    "rideshare-matching-service/redis"
    "rideshare-matching-service/types"
    "rideshare-matching-service/pool"
    "rideshare-matching-service/worker"
    "rideshare-matching-service/database"

    "github.com/gin-gonic/gin"
    "github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool { return true },
}
var ctx = context.Background()

type DriverDBData struct {
    FirstName    string
    LastName     string
    LicensePlate string
    VehicleType  string
    Rating       float64
}

func fetchDriverDataFromDatabase(userID string) (DriverDBData, error) {
    if database.Client == nil {
        return DriverDBData{}, fmt.Errorf("database client is not initialized")
    }

    var profile DriverDBData
    query := `
        SELECT first_name, last_name, license_plate, vehicle_type, rating
        FROM driver_service.drivers 
        WHERE id = $1`

    row := database.Client.QueryRowContext(context.Background(), query, userID)
    err := row.Scan(
        &profile.FirstName,
        &profile.LastName,
        &profile.LicensePlate,
        &profile.VehicleType,
        &profile.Rating,
    )

    if err != nil {
        if err == sql.ErrNoRows {
            return DriverDBData{}, fmt.Errorf("driver not found in database: %s", userID)
        }
        return DriverDBData{}, fmt.Errorf("database query failed: %w", err)
    }

    log.Printf("DB: Fetched profile for %s: %s %s, Plate: %s", userID, profile.FirstName, profile.LastName, profile.LicensePlate)
    return profile, nil
}

func rawWebSocketHandler(w http.ResponseWriter, r *http.Request) {
    userID := r.URL.Query().Get("user_id")
    role := r.URL.Query().Get("role")

    if userID == "" || (role != "driver" && role != "rider") {
        http.Error(w, "Missing user_id or role", http.StatusBadRequest)
        return
    }

    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Printf("WebSocket upgrade failed: %v", err)
        return
    }

    if role == "driver" {
        fetchedDriverData, err := fetchDriverDataFromDatabase(userID)
        if err != nil {
            log.Printf("Error fetching driver profile for %s: %v. Closing connection.", userID, err)
            conn.Close()
            return
        }

        driver := &types.Driver{
            ID:           userID,
            Conn:         &types.WebSocketConnection{Conn: conn, Mu: sync.Mutex{}},
            FirstName:    fetchedDriverData.FirstName,
            LastName:     fetchedDriverData.LastName,
            LicensePlate: fetchedDriverData.LicensePlate,
            VehicleType:  fetchedDriverData.VehicleType,
            Rating:       fetchedDriverData.Rating,
            Lat:          0,
            Lng:          0,
            IsAvailable:  true,
        }

        pool.Pool.Add(driver)
        log.Printf("Driver %s (%s %s) connected → Plate: %s", userID, driver.FirstName, driver.LastName, driver.LicensePlate)
        go handleDriverMessages(conn, userID)
    } else if role == "rider" {
        log.Printf("Rider %s connected", userID)
        go handleRiderMessages(conn, userID)
    }
}

func Start() {
    r := gin.New()
    r.Use(gin.Recovery())
    r.Use(CORSMiddleware())

    r.GET("/health", healthCheck)
    r.GET("/drivers", GetAllDrivers)
    r.GET("/drivers/online", GetOnlineDrivers)

    http.HandleFunc("/ws", rawWebSocketHandler)
    http.Handle("/", r)

    log.Println("Matching Service running on :3004")
    log.Fatal(http.ListenAndServe(":3004", nil))
}

// FIXED: Clean switch, no duplicate cases, full support
func handleDriverMessages(conn *websocket.Conn, driverID string) {
    defer func() {
        pool.Pool.Remove(driverID)
        conn.Close()
        log.Printf("Driver %s disconnected", driverID)
    }()

    for {
        var msg map[string]interface{}
        if err := conn.ReadJSON(&msg); err != nil {
            if websocket.IsCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
                log.Printf("Driver %s closed connection", driverID)
            } else {
                log.Printf("Read error for driver %s: %v", driverID, err)
            }
            break
        }

        action, ok := msg["type"].(string)
        if !ok {
            log.Printf("Driver %s sent message without 'type' field", driverID)
            continue
        }

        log.Printf("DRIVER %s → Action: %s", driverID, action)

        switch action {
        case "ride.accept", "accept_ride":
            rideID, ok := msg["ride_request_id"].(string)
            if !ok || rideID == "" {
                log.Printf("Driver %s sent ride.accept without ride_request_id", driverID)
                continue
            }
            log.Printf("DRIVER %s ACCEPTED RIDE %s", driverID, rideID)
            worker.HandleDriverAcceptance(rideID, driverID)

        case "driver.location_update", "location_update":
            location, ok := msg["location"].(map[string]interface{})
            if !ok {
                continue
            }
            lat, _ := location["lat"].(float64)
            lng, _ := location["lng"].(float64)
            if lat != 0 && lng != 0 {
                pool.Pool.UpdateLocation(driverID, lat, lng)
                log.Printf("Driver %s location updated → (%.6f, %.6f)", driverID, lat, lng)
            }

        case "driver.ready":
            log.Printf("Driver %s sent driver.ready → marking as available", driverID)
            pool.Pool.MarkAvailable(driverID)

        default:
            log.Printf("Unknown action from driver %s: %s", driverID, action)
        }
    }
}

// Rider receives all events: ride.proposed, ride.accepted, etc.
func handleRiderMessages(conn *websocket.Conn, connectedRiderID string) {
    defer conn.Close()

    pubsub := redis.Client.Subscribe(ctx, "ride_request_events")
    defer pubsub.Close()

    ch := pubsub.Channel()
    log.Printf("Rider %s subscribed to ride_request_events", connectedRiderID)

    for msg := range ch {
        var payload map[string]interface{}
        if err := json.Unmarshal([]byte(msg.Payload), &payload); err != nil {
            log.Printf("Failed to unmarshal Redis message: %v", err)
            continue
        }

        intendedRiderID, _ := payload["rider_id"].(string)
        if intendedRiderID != connectedRiderID {
            continue
        }

        rideID, _ := payload["ride_request_id"].(string)
        event, _ := payload["event"].(string)

        log.Printf("→ RIDER %s ← Event: %s | Ride: %s", connectedRiderID, event, rideID)

        if err := conn.WriteJSON(payload); err != nil {
            log.Printf("Rider %s disconnected during write", connectedRiderID)
            break
        }
    }
}

func SendToDriver(driverID string, payload map[string]any) {
    driver, ok := pool.Pool.Get(driverID)
    if !ok || driver.Conn == nil {
        log.Printf("Driver %s not online, cannot send message", driverID)
        return
    }

    if err := driver.Conn.WriteJSON(payload); err != nil {
        log.Printf("Failed to send to driver %s: %v", driverID, err)
    } else {
        log.Printf("Sent to driver %s: %v", driverID, payload)
    }
}

func GetAllDrivers(c *gin.Context) {
    drivers := pool.Pool.ListAll()
    c.JSON(http.StatusOK, gin.H{"drivers": drivers})
}

func GetOnlineDrivers(c *gin.Context) {
    drivers := pool.Pool.ListOnline()
    c.JSON(http.StatusOK, gin.H{"online_drivers": drivers})
}

func CORSMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
        c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
        if c.Request.Method == "OPTIONS" {
            c.AbortWithStatus(204)
            return
        }
        c.Next()
    }
}

func healthCheck(c *gin.Context) {
    if redis.Client == nil {
        c.JSON(500, gin.H{"status": "error", "message": "Redis not connected"})
        return
    }
    if err := redis.Client.Ping(context.Background()).Err(); err != nil {
        c.JSON(500, gin.H{"status": "error", "message": "Redis ping failed: " + err.Error()})
        return
    }
    c.JSON(200, gin.H{"status": "healthy", "redis": "connected"})
}