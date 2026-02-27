
package pool

import (
    "log"
    "sync"
    "math"
    "rideshare-matching-service/types"
)

type DriverPool struct {
    drivers map[string]*types.Driver
    mu      sync.RWMutex
}

var Pool = NewDriverPool()

func NewDriverPool() *DriverPool {
    return &DriverPool{
        drivers: make(map[string]*types.Driver),
    }
}

func (p *DriverPool) Add(driver *types.Driver) {
    p.mu.Lock()
    defer p.mu.Unlock()

    p.drivers[driver.ID] = driver
    log.Printf("POOL: Added Driver %s (%s %s) | Plate: %s | Vehicle: %s",
        driver.ID, driver.FirstName, driver.LastName, driver.LicensePlate, driver.VehicleType)
}


func (p *DriverPool) Remove(driverID string) {
    p.mu.Lock()
    defer p.mu.Unlock()

    if driver, exists := p.drivers[driverID]; exists {
        log.Printf("POOL: Removed Driver %s (%s %s)", driverID, driver.FirstName, driver.LastName)
    } else {
        log.Printf("POOL: Remove called for unknown driver %s", driverID)
    }

    delete(p.drivers, driverID)
}


func (p *DriverPool) Get(driverID string) (*types.Driver, bool) {
    p.mu.RLock()
    defer p.mu.RUnlock()

    driver, exists := p.drivers[driverID]
    return driver, exists
}


func (p *DriverPool) ListAll() map[string]*types.Driver {
    p.mu.RLock()
    defer p.mu.RUnlock()

    list := make(map[string]*types.Driver, len(p.drivers))
    for id, driver := range p.drivers {
        list[id] = driver
    }
    return list
}

// ListOnline returns only available drivers
func (p *DriverPool) ListOnline() []*types.Driver {
    p.mu.RLock()
    defer p.mu.RUnlock()

    var online []*types.Driver
    for _, driver := range p.drivers {
        if driver.IsAvailable {
            online = append(online, driver)
        }
    }
    return online
}

// UpdateLocation updates a driver's location (called from WebSocket location_update)
func (p *DriverPool) UpdateLocation(driverID string, lat, lng float64) {
    p.mu.Lock()
    defer p.mu.Unlock()

    driver, exists := p.drivers[driverID]
    if !exists {
        log.Printf("POOL: UpdateLocation failed — driver %s not found", driverID)
        return
    }

    driver.Lat = lat
    driver.Lng = lng
    p.drivers[driverID] = driver

    log.Printf("POOL: Driver %s location → (%.6f, %.6f)", driverID, lat, lng)
}

// MarkAvailable sets a driver as available (called on driver.ready)
func (p *DriverPool) MarkAvailable(driverID string) {
    p.mu.Lock()
    defer p.mu.Unlock()

    driver, exists := p.drivers[driverID]
    if !exists {
        log.Printf("POOL: MarkAvailable failed — driver %s not found", driverID)
        return
    }

    driver.IsAvailable = true
    p.drivers[driverID] = driver

    log.Printf("POOL: Driver %s is now AVAILABLE and ready for rides", driverID)
}

// SetAvailability changes driver availability (can be used for offline/online toggle)
func (p *DriverPool) SetAvailability(driverID string, isAvailable bool) {
    p.mu.Lock()
    defer p.mu.Unlock()

    driver, exists := p.drivers[driverID]
    if !exists {
        return
    }

    driver.IsAvailable = isAvailable
    p.drivers[driverID] = driver

    status := "AVAILABLE"
    if !isAvailable {
        status = "OFFLINE"
    }
    log.Printf("POOL: Driver %s is now %s", driverID, status)
}

// FindNearbyDrivers returns drivers within radius (used by matching)
func (p *DriverPool) FindNearbyDrivers(lat, lng, radiusKm float64) []*types.Driver {
    p.mu.RLock()
    defer p.mu.RUnlock()

    var nearby []*types.Driver
    for _, driver := range p.drivers {
        if !driver.IsAvailable {
            continue
        }

        dist := haversine(lat, lng, driver.Lat, driver.Lng)
        if dist <= radiusKm {
            nearby = append(nearby, driver)
        }
    }
    return nearby
}

// Simple haversine formula for distance in KM
func haversine(lat1, lon1, lat2, lon2 float64) float64 {
    const R = 6371 // Earth radius in kilometers
    dLat := (lat2 - lat1) * (3.14159265359 / 180)
    dLon := (lon2 - lon1) * (3.14159265359 / 180)
    a := sin(dLat/2)*sin(dLat/2) + cos(lat1*(3.14159265359/180))*cos(lat2*(3.14159265359/180))*sin(dLon/2)*sin(dLon/2)
    c := 2 * atan2(sqrt(a), sqrt(1-a))
    return R * c
}


func sin(x float64) float64  { return math.Sin(x) }
func cos(x float64) float64  { return math.Cos(x) }
func sqrt(x float64) float64 { return math.Sqrt(x) }
func atan2(y, x float64) float64 { return math.Atan2(y, x) }