import math
import logging
import time
from decimal import Decimal
from typing import Dict, Any, Optional

# Assuming these utilities and models exist based on context
from utils.database import get_db_connection
from utils.redis_client import redis_client # NEW: Import Redis client
# Placeholder models for completeness
class FareEstimateRequest:
    def __init__(self, data):
        self.vehicle_type = data.get('vehicle_type', 'standard')
        self.pickup_location = data.get('pickup_location', {})
        self.dropoff_location = data.get('dropoff_location', {})
class FareConfig:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)

logger = logging.getLogger(__name__)

# Must match the channel defined in event_handler.py
RIDE_REQUEST_CHANNEL = "ride_request_events"

class FareService:
    @staticmethod
    def calculate_distance(lat1, lng1, lat2, lng2):
        """Calculate distance using Haversine formula"""
        R = 6371  # Earth radius in km
        
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lng = math.radians(lng2 - lng1)
        
        a = (math.sin(delta_lat / 2) ** 2 + 
             math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return R * c
    
    @staticmethod
    def estimate_fare(request_data: Dict[str, Any]):
        request = FareEstimateRequest(request_data)
        conn = get_db_connection()
        
        try:
            with conn.cursor() as cursor:
                # Get fare configuration for the specific vehicle type
                cursor.execute(
                    "SELECT * FROM trip_service.fare_config WHERE vehicle_type = %s",
                    (request.vehicle_type,)
                )
                row = cursor.fetchone()
                
                if row:
                    columns = [desc[0] for desc in cursor.description]
                    fare_config = dict(zip(columns, row))
                else:
                    # Fallback to standard configuration
                    cursor.execute(
                        "SELECT * FROM trip_service.fare_config WHERE vehicle_type = 'standard'"
                    )
                    row = cursor.fetchone()
                    if row:
                        columns = [desc[0] for desc in cursor.description]
                        fare_config = dict(zip(columns, row))
                    else:
                        # Ultimate fallback
                        fare_config = {
                            'base_fare': Decimal('500.00'),
                            'per_km_rate': Decimal('150.00'),
                            'per_minute_rate': Decimal('20.00'),
                            'minimum_fare': Decimal('800.00'),
                            'surge_multiplier': Decimal('1.00')
                        }
                
                # Calculate distance
                pickup = request.pickup_location
                dropoff = request.dropoff_location
                distance_km = FareService.calculate_distance(
                    pickup.get('lat', 0), pickup.get('lng', 0),
                    dropoff.get('lat', 0), dropoff.get('lng', 0)
                )
                
                # Estimate duration (30 km/h average speed)
                estimated_duration = (distance_km / 30) * 60
                
                # Calculate fare components
                base_fare = fare_config['base_fare']
                per_km_rate = fare_config['per_km_rate']
                per_minute_rate = fare_config['per_minute_rate']
                surge_multiplier = fare_config['surge_multiplier']
                minimum_fare = fare_config['minimum_fare']
                
                distance_fare = Decimal(str(distance_km)) * per_km_rate
                time_fare = Decimal(str(estimated_duration)) * per_minute_rate
                
                # Apply surge multiplier to the total fare
                estimated_fare = (base_fare + distance_fare + time_fare) * surge_multiplier
                estimated_fare = max(estimated_fare, minimum_fare)
                
                result = {
                    "estimated_fare": float(estimated_fare),
                    "distance_km": round(distance_km, 2),
                    "estimated_duration_minutes": int(estimated_duration),
                    "base_fare": float(base_fare),
                    "distance_fare": float(distance_fare),
                    "time_fare": float(time_fare),
                    "surge_multiplier": float(surge_multiplier),
                    "vehicle_type": request.vehicle_type
                }
                
                # --- NEW: Publish a Redis event ---
                event_payload = {
                    "event": "fare.estimated",
                    "timestamp": time.time(),
                    "request_data": request_data,
                    "result": result
                }
                
                # Publish the event to the request channel for visibility/logging
                redis_client.publish_event(RIDE_REQUEST_CHANNEL, event_payload)
                logger.info(f"Published fare.estimated event to Redis: {RIDE_REQUEST_CHANNEL}")

                return result
        except Exception as e:
            logger.error(f"Error estimating fare: {e}")
            raise
        finally:
            conn.close()
        
    # Remaining methods from the user's input: get_fare_configs, update_fare_config
    @staticmethod
    def get_fare_configs():
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute("SELECT * FROM trip_service.fare_config")
                rows = cursor.fetchall()
                columns = [desc[0] for desc in cursor.description]
                
                configs = []
                for row in rows:
                    config_data = dict(zip(columns, row))
                    configs.append(FareConfig(**config_data))
                
                return configs
        finally:
            conn.close()

    @staticmethod
    def update_fare_config(vehicle_type, config_data):
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO trip_service.fare_config 
                    (vehicle_type, base_fare, per_km_rate, per_minute_rate, minimum_fare, surge_multiplier)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (vehicle_type) DO UPDATE SET
                    base_fare = EXCLUDED.base_fare,
                    per_km_rate = EXCLUDED.per_km_rate,
                    per_minute_rate = EXCLUDED.per_minute_rate,
                    minimum_fare = EXCLUDED.minimum_fare,
                    surge_multiplier = EXCLUDED.surge_multiplier,
                    updated_at = CURRENT_TIMESTAMP
                """, (
                    vehicle_type,
                    config_data['base_fare'],
                    config_data['per_km_rate'],
                    config_data['per_minute_rate'],
                    config_data['minimum_fare'],
                    config_data['surge_multiplier']
                ))
                conn.commit()
                return True
        finally:
            conn.close()