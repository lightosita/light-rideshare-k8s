import logging
from typing import Optional, Dict, Any, List
import json
from decimal import Decimal

from utils.redis_client import redis_client
from utils.database import get_db_connection

logger = logging.getLogger(__name__)

class TripService:
    """
    Business logic for the Trip Service.
    
    Resolved Issues:
    - Fixed driver_info being NULL in database
    - Fixed JSON field name consistency (licensePlate vs license_plate)
    - Added method to fix existing trips with missing driver_info
    """

    COMMISSION_RATE = Decimal('0.20')

    # ────────────────────────────────────────────────
    # 1. TRIP CREATION & ENRICHMENT (FIXED)
    # ────────────────────────────────────────────────
    @staticmethod
    def create_trip_from_event(event_data: Dict[str, Any]) -> Optional[str]:
        ride_request_id = (
            event_data.get("ride_request_id")
            or event_data.get("request_id")
            or event_data.get("ride")
        )
        driver_id = event_data.get("driver_id") or event_data.get("driverId")
        rider_id = event_data.get("rider_id") or event_data.get("riderId")

        if not ride_request_id or not driver_id:
            logger.error(f"Missing IDs for trip. Ride: {ride_request_id}, Driver: {driver_id}")
            return None

        # Default driver info
        driver_info = {
            "name": "Unknown Driver",
            "phone": "",
            "rating": 4.8,
            "vehicle": "",
            "licensePlate": ""
        }

        # Try to fetch driver info from driver_service
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT first_name, last_name, phone, rating, 
                               vehicle_make, vehicle_model, license_plate 
                        FROM driver_service.drivers 
                        WHERE id = %s
                        """,
                        (driver_id,),
                    )
                    d = cur.fetchone()
                    if d:
                        # Build driver name
                        first_name = d[0] or ""
                        last_name = d[1] or ""
                        driver_name = f"{first_name} {last_name}".strip()
                        
                        # Build vehicle info
                        vehicle_make = d[4] or ""
                        vehicle_model = d[5] or ""
                        vehicle = f"{vehicle_make} {vehicle_model}".strip()
                        
                        driver_info = {
                            "name": driver_name if driver_name else "Unknown Driver",
                            "phone": d[2] or "",
                            "rating": float(d[3]) if d[3] is not None else 4.8,
                            "vehicle": vehicle,
                            "licensePlate": d[6] or ""
                        }
                        logger.info(f"Driver info fetched for {driver_id}: {driver_info}")
                    else:
                        logger.warning(f"Driver {driver_id} not found in database, using defaults")
        except Exception as e:
            logger.error(f"Driver enrichment failed: {e}")
            # Continue with default driver_info

        # Ensure driver_info is never None
        if not driver_info:
            driver_info = {
                "name": "Unknown Driver",
                "phone": "",
                "rating": 4.8,
                "vehicle": "",
                "licensePlate": ""
            }

        try:
            # Convert to JSON string
            driver_info_json = json.dumps(driver_info)
            
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO trip_service.trips (
                            ride_request_id, rider_id, driver_id, 
                            pickup_lat, pickup_lng, pickup_address,
                            dropoff_lat, dropoff_lng, dropoff_address,
                            vehicle_type, estimated_fare, rider_name, 
                            rider_phone, rider_rating, driver_info, status
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'accepted')
                        ON CONFLICT (ride_request_id) DO UPDATE SET
                            driver_id     = EXCLUDED.driver_id,
                            driver_info   = EXCLUDED.driver_info,
                            status        = EXCLUDED.status,
                            updated_at    = CURRENT_TIMESTAMP
                        RETURNING id
                        """,
                        (
                            ride_request_id, rider_id, driver_id,
                            event_data.get("pickup_lat"), event_data.get("pickup_lng"), event_data.get("pickup_address"),
                            event_data.get("dropoff_lat"), event_data.get("dropoff_lng"), event_data.get("dropoff_address"),
                            event_data.get("vehicle_type", "sedan"), event_data.get("estimated_fare"),
                            event_data.get("rider_name", "Passenger"), event_data.get("rider_phone"),
                            event_data.get("rider_rating", 4.8), driver_info_json,
                        ),
                    )
                    row = cur.fetchone()
                    conn.commit()
                    trip_id = str(row[0]) if row else None
                    if trip_id:
                        logger.info(f"Trip created/updated: {trip_id} for request {ride_request_id}")
                    return trip_id
        except Exception as e:
            logger.error(f"Trip upsert failed: {e}")
            return None

    # ────────────────────────────────────────────────
    # 2. STATUS TRANSITIONS & EVENT PUBLISHING
    # ────────────────────────────────────────────────
    @staticmethod
    def update_trip_status_by_request_id(
        ride_request_id: str, 
        new_status: str,
        distance_km: Optional[float] = None,
        duration_minutes: Optional[int] = None
    ) -> Optional[Dict]:
        allowed_prev = {
            "arrived": ["pending", "accepted", "arrived"],
            "started": ["arrived", "started"],
            "completed": ["started", "completed"]
        }

        prev_statuses = allowed_prev.get(new_status)
        if not prev_statuses:
            logger.warning(f"Invalid status transition to {new_status}")
            return None

        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    # Update SQL dynamically to include completion metrics if necessary
                    extra_fields = ""
                    params = [new_status]
                    
                    if new_status == 'completed':
                        extra_fields = ", completed_at = CURRENT_TIMESTAMP, actual_fare = estimated_fare, distance_km = %s, duration_minutes = %s"
                        params.extend([distance_km, duration_minutes])
                    
                    params.extend([ride_request_id, prev_statuses])

                    sql = f"""
                        UPDATE trip_service.trips 
                        SET status = %s, updated_at = CURRENT_TIMESTAMP {extra_fields}
                        WHERE ride_request_id = %s 
                          AND status = ANY(%s::text[])
                        RETURNING id, status, rider_id, driver_id
                    """
                    
                    cur.execute(sql, tuple(params))
                    row = cur.fetchone()
                    conn.commit()

                    if row:
                        event_payload = {
                            "trip_id": str(row[0]),
                            "new_status": row[1],
                            "rider_id": str(row[2]),
                            "driver_id": str(row[3]),
                            "event": "trip.status_updated"
                        }
                        
                        redis_client.publish_event("trip_service.updates", event_payload)
                        logger.info(f"Trip status updated: {ride_request_id} -> {new_status}")
                        
                        return {
                            "id": event_payload["trip_id"],
                            "status": event_payload["new_status"],
                            "rider_id": event_payload["rider_id"],
                            "driver_id": event_payload["driver_id"]
                        }
                    else:
                        logger.warning(f"No trip found or invalid status transition for {ride_request_id}")
        except Exception as e:
            logger.error(f"Status update failed for {ride_request_id}: {e}")
        return None

    # ────────────────────────────────────────────────
    # 3. ROUTE COMPATIBILITY WRAPPERS
    # ────────────────────────────────────────────────
    @staticmethod
    def mark_trip_arrived(rid: str):
        return TripService.update_trip_status_by_request_id(rid, "arrived")

    @staticmethod
    def mark_trip_started(rid: str):
        return TripService.update_trip_status_by_request_id(rid, "started")

    @staticmethod
    def complete_trip_by_request_id(
        ride_request_id: str, 
        distance_km: Optional[float] = None, 
        duration_minutes: Optional[int] = None
    ) -> Optional[str]:
        """Entry point for /trips/request/<id>/complete."""
        res = TripService.mark_trip_completed(
            ride_request_id, 
            distance_km=distance_km, 
            duration_minutes=duration_minutes
        )
        return res["id"] if res else None

    @staticmethod
    def mark_trip_completed(
        rid: str, 
        distance_km: Optional[float] = None, 
        duration_minutes: Optional[int] = None
    ):
        """Internal logic for completion, includes payment trigger."""
        res = TripService.update_trip_status_by_request_id(
            rid, 
            "completed", 
            distance_km=distance_km, 
            duration_minutes=duration_minutes
        )
        if res:
            TripService.process_trip_payment(res["id"])
        return res

    # ────────────────────────────────────────────────
    # 4. PAYMENT PROCESSING
    # ────────────────────────────────────────────────
    @staticmethod
    def process_trip_payment(trip_id: str) -> bool:
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT driver_id, COALESCE(actual_fare, estimated_fare) FROM trip_service.trips WHERE id = %s",
                        (trip_id,)
                    )
                    trip = cur.fetchone()
                    if not trip or trip[1] is None: 
                        logger.warning(f"No fare found for trip {trip_id}")
                        return False

                    driver_id, fare = trip[0], Decimal(str(trip[1]))
                    commission = fare * TripService.COMMISSION_RATE
                    driver_net = fare - commission

                    cur.execute(
                        """
                        INSERT INTO trip_service.driver_accounts (driver_id, current_balance, total_earnings)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (driver_id) DO UPDATE SET
                            current_balance = driver_accounts.current_balance + EXCLUDED.current_balance,
                            total_earnings  = driver_accounts.total_earnings  + EXCLUDED.total_earnings,
                            last_payment_date = CURRENT_TIMESTAMP
                        """,
                        (driver_id, driver_net, driver_net),
                    )
                    conn.commit()
                    logger.info(f"Payment processed for trip {trip_id}: driver={driver_id}, fare={fare}, net={driver_net}")
                    return True
        except Exception as e:
            logger.error(f"Payment failed for trip {trip_id}: {e}")
            return False

    # ────────────────────────────────────────────────
    # 5. FETCHING METHODS (FIXED)
    # ────────────────────────────────────────────────
    @staticmethod
    def get_trip_details_by_id(trip_id: str) -> Optional[Dict[str, Any]]:
        """Used by GET /trips/<trip_id>"""
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT * FROM trip_service.trips WHERE id = %s", (trip_id,)
                    )
                    columns = [desc[0] for desc in cur.description]
                    row = cur.fetchone()
                    if row:
                        res = dict(zip(columns, row))
                        # Clean up types for JSON serialization
                        if 'driver_info' in res:
                            if res['driver_info'] is None:
                                res['driver_info'] = {}
                            elif isinstance(res['driver_info'], str):
                                try:
                                    res['driver_info'] = json.loads(res['driver_info'])
                                except json.JSONDecodeError:
                                    res['driver_info'] = {}
                        return res
        except Exception as e:
            logger.error(f"Error fetching trip details: {e}")
        return None

    @staticmethod
    def get_active_trip_for_rider(rider_id: str) -> Optional[Dict[str, Any]]:
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT id, ride_request_id, status, driver_id, rider_id,
                               pickup_lat, pickup_lng, pickup_address,
                               dropoff_lat, dropoff_lng, dropoff_address,
                               vehicle_type, estimated_fare, rider_name, rider_phone, 
                               rider_rating, driver_info
                        FROM trip_service.trips
                        WHERE rider_id = %s AND status IN ('accepted', 'arrived', 'started')
                        ORDER BY created_at DESC LIMIT 1
                        """, (rider_id,)
                    )
                    row = cur.fetchone()
                    if not row: 
                        return None
                    
                    # Parse driver_info - handle NULL, string, or dict
                    driver_info_raw = row[16]
                    driver_info = {}
                    
                    if driver_info_raw is None:
                        # If driver_info is NULL, try to fetch from driver_service
                        driver_id = row[3]
                        driver_info = TripService._get_driver_info_from_service(driver_id)
                    elif isinstance(driver_info_raw, str):
                        try:
                            driver_info = json.loads(driver_info_raw) if driver_info_raw else {}
                        except json.JSONDecodeError:
                            driver_info = {}
                    else:
                        driver_info = driver_info_raw or {}
                    
                    # Handle both naming conventions
                    license_plate = (
                        driver_info.get("licensePlate") or 
                        driver_info.get("license_plate") or 
                        ""
                    )
                    
                    return {
                        "id": str(row[0]), 
                        "rideRequestId": str(row[1]), 
                        "status": row[2],
                        "driver_id": str(row[3]), 
                        "rider_id": str(row[4]),
                        "pickupLat": float(row[5]) if row[5] is not None else 0.0,
                        "pickupLng": float(row[6]) if row[6] is not None else 0.0,
                        "pickupAddress": row[7] or "",
                        "dropoffLat": float(row[8]) if row[8] is not None else 0.0,
                        "dropoffLng": float(row[9]) if row[9] is not None else 0.0,
                        "dropoffAddress": row[10] or "",
                        "vehicleType": row[11] or "sedan",
                        "estimatedFare": float(row[12]) if row[12] is not None else 0.0,
                        "driverInfo": {
                            "name": driver_info.get("name", "Unknown Driver"),
                            "phone": driver_info.get("phone", ""),
                            "rating": float(driver_info.get("rating", 4.8)),
                            "vehicle": driver_info.get("vehicle", ""),
                            "licensePlate": license_plate,
                        },
                    }
        except Exception as e:
            logger.error(f"Error fetching rider trip: {e}")
            return None

    @staticmethod
    def get_active_trip_for_driver(driver_id: str) -> Optional[Dict[str, Any]]:
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT id, ride_request_id, status, rider_id,
                               pickup_lat, pickup_lng, pickup_address,
                               dropoff_lat, dropoff_lng, dropoff_address,
                               estimated_fare, rider_name, rider_phone, rider_rating, driver_info
                        FROM trip_service.trips
                        WHERE driver_id = %s AND status IN ('accepted', 'arrived', 'started')
                        ORDER BY created_at DESC LIMIT 1
                        """, (driver_id,)
                    )
                    row = cur.fetchone()
                    if not row: 
                        return None
                    
                    # Parse driver_info
                    driver_info_raw = row[14]
                    driver_info = {}
                    
                    if driver_info_raw is None:
                        # If driver_info is NULL, fetch from driver_service
                        driver_info = TripService._get_driver_info_from_service(driver_id)
                    elif isinstance(driver_info_raw, str):
                        try:
                            driver_info = json.loads(driver_info_raw) if driver_info_raw else {}
                        except json.JSONDecodeError:
                            driver_info = {}
                    else:
                        driver_info = driver_info_raw or {}
                    
                    # Handle both naming conventions
                    license_plate = (
                        driver_info.get("licensePlate") or 
                        driver_info.get("license_plate") or 
                        ""
                    )
                    
                    return {
                        "id": str(row[0]), 
                        "ride_request_id": str(row[1]), 
                        "status": row[2],
                        "pickup_lat": float(row[4]) if row[4] is not None else 0.0,
                        "pickup_lng": float(row[5]) if row[5] is not None else 0.0,
                        "pickup_address": row[6] or "",
                        "dropoff_lat": float(row[7]) if row[7] is not None else 0.0,
                        "dropoff_lng": float(row[8]) if row[8] is not None else 0.0,
                        "dropoff_address": row[9] or "",
                        "estimated_fare": float(row[10]) if row[10] is not None else 0.0,
                        "rider_info": {
                            "id": str(row[3]), 
                            "name": row[11] or "Passenger",
                            "phone": row[12] or "", 
                            "rating": float(row[13]) if row[13] is not None else 4.8,
                        },
                        "driver_info": driver_info,
                    }
        except Exception as e:
            logger.error(f"Error fetching driver trip: {e}")
            return None

    # ────────────────────────────────────────────────
    # 6. FIX METHODS FOR EXISTING TRIPS
    # ────────────────────────────────────────────────
    @staticmethod
    def fix_missing_driver_info(ride_request_id: str) -> bool:
        """Fix a specific trip with missing driver_info"""
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    # Get the trip
                    cur.execute(
                        "SELECT driver_id FROM trip_service.trips WHERE ride_request_id = %s",
                        (ride_request_id,)
                    )
                    trip = cur.fetchone()
                    if not trip:
                        logger.error(f"Trip not found: {ride_request_id}")
                        return False
                    
                    driver_id = trip[0]
                    
                    # Get or create driver info
                    driver_info = TripService._get_driver_info_from_service(driver_id)
                    driver_info_json = json.dumps(driver_info)
                    
                    # Update the trip
                    cur.execute(
                        "UPDATE trip_service.trips SET driver_info = %s, updated_at = CURRENT_TIMESTAMP WHERE ride_request_id = %s",
                        (driver_info_json, ride_request_id)
                    )
                    conn.commit()
                    logger.info(f"Fixed driver_info for trip {ride_request_id}")
                    return True
                    
        except Exception as e:
            logger.error(f"Failed to fix driver_info: {e}")
            return False

    @staticmethod
    def fix_all_missing_driver_info() -> int:
        """Fix ALL trips with missing driver_info, returns count fixed"""
        fixed_count = 0
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    # Get all trips with NULL driver_info
                    cur.execute(
                        "SELECT ride_request_id, driver_id FROM trip_service.trips WHERE driver_info IS NULL"
                    )
                    trips = cur.fetchall()
                    
                    for ride_request_id, driver_id in trips:
                        try:
                            # Get or create driver info
                            driver_info = TripService._get_driver_info_from_service(driver_id)
                            driver_info_json = json.dumps(driver_info)
                            
                            # Update the trip
                            cur.execute(
                                "UPDATE trip_service.trips SET driver_info = %s, updated_at = CURRENT_TIMESTAMP WHERE ride_request_id = %s",
                                (driver_info_json, ride_request_id)
                            )
                            fixed_count += 1
                            logger.info(f"Fixed trip {ride_request_id}")
                            
                        except Exception as e:
                            logger.error(f"Failed to fix trip {ride_request_id}: {e}")
                            continue
                    
                    conn.commit()
                    logger.info(f"Fixed {fixed_count} trips with missing driver_info")
                    return fixed_count
                    
        except Exception as e:
            logger.error(f"Failed to fix all trips: {e}")
            return 0

    # ────────────────────────────────────────────────
    # 7. HELPER METHODS
    # ────────────────────────────────────────────────
    @staticmethod
    def _get_driver_info_from_service(driver_id: str) -> Dict[str, Any]:
        """Fetch driver info from driver_service.drivers table"""
        driver_info = {
            "name": "Unknown Driver",
            "phone": "",
            "rating": 4.8,
            "vehicle": "",
            "licensePlate": ""
        }
        
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT first_name, last_name, phone, rating, 
                               vehicle_make, vehicle_model, license_plate 
                        FROM driver_service.drivers 
                        WHERE id = %s
                        """,
                        (driver_id,),
                    )
                    d = cur.fetchone()
                    if d:
                        first_name = d[0] or ""
                        last_name = d[1] or ""
                        driver_name = f"{first_name} {last_name}".strip()
                        
                        vehicle_make = d[4] or ""
                        vehicle_model = d[5] or ""
                        vehicle = f"{vehicle_make} {vehicle_model}".strip()
                        
                        driver_info = {
                            "name": driver_name if driver_name else "Unknown Driver",
                            "phone": d[2] or "",
                            "rating": float(d[3]) if d[3] is not None else 4.8,
                            "vehicle": vehicle,
                            "licensePlate": d[6] or ""
                        }
        except Exception as e:
            logger.error(f"Failed to fetch driver info for {driver_id}: {e}")
        
        return driver_info

    @staticmethod
    def get_trip_by_request_id(ride_request_id: str) -> Optional[Dict[str, Any]]:
        """Get trip by ride request ID"""
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT id, status, driver_id, rider_id, driver_info
                        FROM trip_service.trips 
                        WHERE ride_request_id = %s
                        """, (ride_request_id,)
                    )
                    row = cur.fetchone()
                    if row:
                        # Parse driver_info
                        driver_info_raw = row[4]
                        driver_info = {}
                        
                        if driver_info_raw is None:
                            driver_info = TripService._get_driver_info_from_service(row[2])
                        elif isinstance(driver_info_raw, str):
                            try:
                                driver_info = json.loads(driver_info_raw) if driver_info_raw else {}
                            except json.JSONDecodeError:
                                driver_info = {}
                        else:
                            driver_info = driver_info_raw or {}
                        
                        return {
                            "id": str(row[0]),
                            "status": row[1],
                            "driver_id": str(row[2]),
                            "rider_id": str(row[3]),
                            "driver_info": driver_info
                        }
        except Exception as e:
            logger.error(f"Error fetching trip by request ID {ride_request_id}: {e}")
        return None

    @staticmethod
    def get_ride_request_from_db(ride_request_id: str) -> tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Fetch ride request details directly from rider_service. Returns (data, error_message)."""
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT id, rider_id, pickup_lat, pickup_lng, pickup_address,
                               dropoff_lat, dropoff_lng, dropoff_address,
                               vehicle_type, estimated_fare
                        FROM rider_service.ride_requests
                        WHERE id = %s
                        """,
                        (ride_request_id,)
                    )
                    row = cur.fetchone()
                    if row:
                        data = {
                            "ride_request_id": row[0],
                            "rider_id": row[1],
                            "pickup_lat": float(row[2]),
                            "pickup_lng": float(row[3]),
                            "pickup_address": row[4],
                            "dropoff_lat": float(row[5]),
                            "dropoff_lng": float(row[6]),
                            "dropoff_address": row[7],
                            "vehicle_type": row[8],
                            "estimated_fare": float(row[9]) if row[9] else 0.0
                        }
                        return data, None
                    else:
                        return None, "Ride request not found in database (row is None)"
        except Exception as e:
            msg = f"Failed to fetch ride request {ride_request_id}: {str(e)}"
            logger.error(msg)
            return None, msg