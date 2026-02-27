# Ride Matching Service

**Language**: Go  
**Role**: Real-time ride matching engine  
**Communication**: Redis Pub/Sub (for events) + WebSocket (to drivers)  
**HTTP API**: None (message-driven only – no Swagger/OpenAPI)  

This service listens for new ride requests via Redis Pub/Sub, matches them to nearby/available drivers using geospatial logic, proposes rides via WebSocket to drivers, and publishes outcome events back to Redis.

## Key Dependencies

- **Redis** (for Pub/Sub channels and geospatial driver indexing)  
  - Host: `local-redis` (resolves via Docker network)  
  - Port: 6379  
  - Auth: Password from `.env` (`REDIS_PASSWORD`)  

- **Shared Docker Network**: `swiftride-net` (external – all services join this for name resolution)

## Setup & Running (Local Development)

Each service runs **independently** from its own folder.

1. **Prerequisites**
   - Docker & Docker Compose installed
   - Shared network exists:  
     ```bash
     docker network create swiftride-net
     ```
   - Redis running (shared instance – start once):  
     ```bash
     docker run -d \
       --name local-redis \
       --network swiftride-net \
       -p 6379:6379 \
       redis:7-alpine \
       --requirepass ${REDIS_PASSWORD}
     ```
     (Use your actual password from `.env`.)

2. **Start the service**
   ```bash
   # From this folder (rideshare-matching-service)
   docker compose up --build -d


Event Contracts & Flow

1. Consumes – Incoming Ride RequestChannel: ride_request_events
Event name: ride.requestedjson

{
  "event": "ride.requested",
  "data": {
    "ride_request_id": "req_67a4f9b2c1",
    "rider_id": "rider_8f2d9e1a",
    "rider_name": "Chinedu Okeke",
    "rider_rating": 4.82,
    "rider_phone": "+2348123456789",
    "pickup_location": {
      "lat": 6.5244,
      "lng": 3.3792,
      "address": "100 Awolowo Road, Ikoyi"
    },
    "dropoff_location": {
      "lat": 6.6018,
      "lng": 3.3515,
      "address": "Ikeja City Mall"
    },
    "vehicle_type": "standard",
    "fare": 2850.00
  }
}

2. Publishes – Outgoing EventsAll published to channel: ride_request_eventsEvent
Triggered When
Key Fields Added
ride.proposed
Proposal sent to driver (via WebSocket)
distance_km, duration_min
ride.accepted
Driver accepts
driverInfo (name, plate, rating, etc.)
ride.timed_out
No acceptance within 30 seconds
—
ride.no_drivers
No eligible drivers within 5 km
—

Example: ride.acceptedjson

{
  "event": "ride.accepted",
  "ride_request_id": "req_67a4f9b2c1",
  "rider_id": "rider_8f2d9e1a",
  "rider_name": "Chinedu Okeke",
  "rider_phone": "+2348123456789",
  "rider_rating": 4.82,
  "status": "accepted",
  "driverInfo": {
    "id": "drv_3f8e2d9a",
    "firstName": "Ahmed Yusuf",
    "vehicleType": "standard",
    "rating": 4.91,
    "licensePlate": "LAG-442-KLM"
  },
  "pickup": { "lat": 6.5244, "lng": 3.3792, "address": "100 Awolowo Road" },
  "dropoff": { "lat": 6.6018, "lng": 3.3515, "address": "Ikeja City Mall" },
  "vehicle_type": "standard",
  "estimated_fare": 2850
}

3. WebSocket – Real-time Proposal to Driver AppSent directly to the driver's connected WebSocket:json

{
  "event": "ride.proposed",
  "distance_km": 2.41,
  "duration_min": 11,
  "data": {
    "ride_request_id": "req_67a4f9b2c1",
    "rider_id": "rider_8f2d9e1a",
    "rider_name": "Chinedu Okeke",
    "rider_rating": 4.82,
    "pickup_address": "100 Awolowo Road, Ikoyi",
    "dropoff_address": "Ikeja City Mall",
    "pickup_location": { "lat": 6.5244, "lng": 3.3792 },
    "dropoff_location": { "lat": 6.6018, "lng": 3.3515 },
    "estimated_fare": 2850,
    "vehicle_type": "standard"
  }
}

4. Matching Rules (Current Logic)Max search radius: 5.0 km
Vehicle type must match exactly (case-insensitive)
Only one driver gets the proposal (first eligible in geospatial order)
Auto-cancel proposal after 30 seconds if no acceptance
Uses Redis geospatial commands (e.g. GEOADD/GEORADIUS) for driver location matching

5. High-Level Flow

Rider Service
     ↓
     Publish "ride.requested" → Redis (channel: ride_request_events)
     ↓
Matching Service (subscribes to ride_request_events)
     ↓ Finds nearby drivers (Redis GEO)
     ↓ Sends "ride.proposed" via WebSocket → Driver App
     ↓
Driver accepts → POST /api/v1/ride/accept (to driver or gateway service)
     ↓ Matching Service claims ride (e.g. Redis SetNX lock)
     ↓ Publishes "ride.accepted" → Redis
     ↓ Rider App receives update (via another Pub/Sub or push)

