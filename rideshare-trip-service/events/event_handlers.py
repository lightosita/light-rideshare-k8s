import threading
import logging
import time
import json
import uuid
from typing import Dict, Any, Optional, Callable

from utils.redis_client import redis_client
from services.trip_service import TripService
from utils.database import get_db_connection

logger = logging.getLogger(__name__)

# --- Configuration ---
MAX_RETRIES = 5
RETRY_DELAY_SECONDS = 2
LOCK_TIMEOUT = 30

# --- Event Channels ---
RIDE_REQUEST_CHANNEL = "ride_request_events"
TRIP_UPDATES_CHANNEL = "trip_service.updates"


class EventHandler:
    def __init__(self):
        self.rider_cache = {}

    def _acquire_lock(self, lock_key: str) -> Optional[str]:
        lock_value = str(uuid.uuid4())
        acquired = redis_client.set(lock_key, lock_value, nx=True, ex=LOCK_TIMEOUT)
        if acquired:
            return lock_value
        return None

    def _release_lock(self, lock_key: str, lock_value: str):
        try:
            current = redis_client.get(lock_key)
            if current and current.decode() == lock_value:
                redis_client.delete(lock_key)
        except Exception as e:
            logger.debug(f"Error releasing lock {lock_key}: {e}")

    def handle_event(self, channel: str, event_data: Dict[str, Any]):
        logger.info(f"Received event on channel '{channel}': {event_data.get('event', 'unknown')}")

        event_type = event_data.get('event')
        if not event_type and 'status' in event_data:
            status_map = {
                'accepted': 'ride.accepted',
                'no_drivers': 'ride.no_drivers',
                'timed_out': 'ride.timed_out',
                'cancelled': 'ride.cancelled',
                'started': 'ride.started',
                'completed': 'ride.completed'
            }
            event_type = status_map.get(event_data.get('status'))

        if not event_type:
            logger.warning(f"Unrecognized event format: {event_data}")
            return

        logger.info(f"Processing event → **{event_type}**")

        if event_type == 'ride.requested':
            self.handle_ride_requested(event_data)
        elif event_type == 'ride.accepted':
            ride_request_id = event_data.get('ride_request_id')
            if not ride_request_id:
                logger.error("ride.accepted event missing ride_request_id")
                return

            lock_key = f"lock:ride_accepted:{ride_request_id}"
            lock_value = self._acquire_lock(lock_key)
            if not lock_value:
                logger.info(f"Duplicate ride.accepted skipped → {ride_request_id}")
                return

            try:
                self.handle_ride_accepted(event_data)
            finally:
                self._release_lock(lock_key, lock_value)

        else:
            try:
                if event_type == 'ride.started':
                    self.handle_ride_started(event_data)
                elif event_type == 'ride.completed':
                    self.handle_ride_completed(event_data)
                elif event_type in ('ride.cancelled', 'ride.timed_out', 'ride.no_drivers'):
                    self.handle_ride_cancelled(event_data)
                elif event_type == 'trip.status_updated':
                    self.handle_trip_status_updated(event_data)
                elif event_type == 'trip.created':
                    logger.debug(f"Ignoring own event {event_type} (loopback)")
                elif event_type == 'trip.payment_processed':
                    self.handle_trip_payment_processed(event_data)
                elif event_type == 'trip.payment_success':
                    self.handle_trip_payment_success(event_data)
                else:
                    logger.warning(f"Unhandled event type: {event_type}")
            except Exception as e:
                logger.error(f"Error processing {event_type}: {e}", exc_info=True)

    def handle_ride_requested(self, event_data: Dict[str, Any]):
        data = event_data.get('data', {})
        ride_request_id = data.get('ride_request_id')
        rider_id = data.get('rider_id')
        rider_name = data.get('rider_name')
        rider_rating = data.get('rider_rating')

        if ride_request_id and rider_id:
            self.rider_cache[ride_request_id] = {
                'rider_id': rider_id,
                'rider_name': rider_name or "Passenger",
                'rider_rating': rider_rating or 4.8
            }
            logger.info(f"Cached rider info for request {ride_request_id}: {rider_name}")
        else:
            logger.warning(f"Missing data in ride.requested: {event_data}")

    def _retry_db_operation(self, operation: Callable[..., Any], operation_name: str, **kwargs):
        for attempt in range(MAX_RETRIES):
            try:
                result = operation(**kwargs)
                logger.info(f"{operation_name} → Success | Result: {result}")
                return result
            except Exception as e:
                logger.warning(f"{operation_name} failed (attempt {attempt + 1}/{MAX_RETRIES}): {e}")
                if attempt < MAX_RETRIES - 1:
                    time.sleep(RETRY_DELAY_SECONDS)
        logger.error(f"{operation_name} → Permanently failed")
        return None

    def handle_ride_accepted(self, event_data: Dict[str, Any]):
        # Log full payload for debugging
        logger.debug(f"Full ride.accepted payload received:\n{json.dumps(event_data, indent=2)}")

        ride_request_id = event_data.get('ride_request_id')

        driver_info = event_data.get('driverInfo', {})
        driver_id = driver_info.get('id')
        if not driver_id:
            driver_id = event_data.get('driver_id') or driver_info.get('driver_id')

        rider_id = event_data.get('rider_id')
        if not rider_id:
            logger.error(f"[ride.accepted] rider_id missing in payload → cannot create trip")
            return

        if not ride_request_id or not driver_id:
            logger.error(f"[ride.accepted] Missing ride_request_id or driver_id → full payload: {json.dumps(event_data, indent=2)}")
            return

        logger.info(f"[ride.accepted] Creating trip for ride {ride_request_id} → driver {driver_id} / rider {rider_id}")

        def insert_trip():
            conn = None
            cur = None
            try:
                conn = get_db_connection()
                cur = conn.cursor()

                pickup = event_data.get('pickup', {})
                dropoff = event_data.get('dropoff', {})

                pickup_lat = pickup.get('lat')
                pickup_lng = pickup.get('lng')
                pickup_address = pickup.get('address', '')

                dropoff_lat = dropoff.get('lat')
                dropoff_lng = dropoff.get('lng')
                dropoff_address = dropoff.get('address', '')

                estimated_fare = event_data.get('estimated_fare', 0)
                rider_name = event_data.get('rider_name', 'Passenger')
                rider_phone = event_data.get('rider_phone') or None
                rider_rating = event_data.get('rider_rating', 4.8)
                vehicle_type = event_data.get('vehicle_type', 'standard')

                logger.info(f"INSERTING trip - ride={ride_request_id}, rider={rider_name}, pickup={pickup_address}, dropoff={dropoff_address}, fare={estimated_fare}")

                cur.execute("""
                    INSERT INTO trip_service.trips (
                        id,
                        ride_request_id,
                        driver_id,
                        rider_id,
                        rider_name,
                        rider_phone,
                        rider_rating,
                        pickup_lat,
                        pickup_lng,
                        pickup_address,
                        dropoff_lat,
                        dropoff_lng,
                        dropoff_address,
                        estimated_fare,
                        vehicle_type,
                        status,
                        created_at,
                        updated_at
                    ) VALUES (
                        gen_random_uuid(),
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        'accepted',
                        NOW(),
                        NOW()
                    ) RETURNING id
                """, (
                    ride_request_id,
                    driver_id,
                    rider_id,
                    rider_name,
                    rider_phone,
                    rider_rating,
                    pickup_lat,
                    pickup_lng,
                    pickup_address,
                    dropoff_lat,
                    dropoff_lng,
                    dropoff_address,
                    estimated_fare,
                    vehicle_type
                ))

                new_trip_id = cur.fetchone()[0]
                conn.commit()

                logger.info(f"[ride.accepted] SUCCESS - Trip created: {new_trip_id} for rider {rider_name}")
                return new_trip_id

            except Exception as e:
                if conn:
                    conn.rollback()
                logger.error(f"[ride.accepted] INSERT FAILED: {str(e)}", exc_info=True)
                raise

            finally:
                if cur:
                    cur.close()
                if conn:
                    conn.close()

        trip_id = self._retry_db_operation(
            insert_trip,
            f"Create trip for ride {ride_request_id}"
        )

        if trip_id:
            redis_client.publish(
                f"driver:{driver_id}",
                json.dumps({
                    "event": "trip.created",
                    "trip_id": str(trip_id),
                    "ride_request_id": ride_request_id,
                    "status": "accepted",
                    "driverInfo": driver_info,
                    "pickup": event_data.get("pickup"),
                    "dropoff": event_data.get("dropoff"),
                    "estimated_fare": event_data.get("estimated_fare"),
                    "rider_name": event_data.get("rider_name"),
                    "rider_phone": event_data.get("rider_phone"),
                    "rider_rating": event_data.get("rider_rating"),
                    "vehicle_type": event_data.get("vehicle_type"),
                    "timestamp": time.time()
                })
            )
            logger.info(f"[ride.accepted] Published trip.created confirmation to driver {driver_id}")
        else:
            logger.error(f"[ride.accepted] Failed to create trip after retries")

    def handle_ride_started(self, event_data: Dict[str, Any]):
        ride_request_id = event_data.get('ride_request_id')
        if ride_request_id:
            self._retry_db_operation(
                TripService.update_trip_status_by_request_id,
                f"Ride started [{ride_request_id}]",
                ride_request_id=ride_request_id,
                new_status="started"
            )

    def handle_ride_completed(self, event_data: Dict[str, Any]):
        ride_request_id = event_data.get('ride_request_id')
        if not ride_request_id:
            return
        distance = event_data.get('distance_km')
        duration = event_data.get('duration_minutes')
        if distance is not None and duration is not None:
            self._retry_db_operation(
                TripService.complete_trip_by_request_id,
                f"Ride completed with metrics [{ride_request_id}]",
                ride_request_id=ride_request_id,
                distance_km=distance,
                duration_minutes=duration
            )
        else:
            self._retry_db_operation(
                TripService.update_trip_status_by_request_id,
                f"Ride completed [{ride_request_id}]",
                ride_request_id=ride_request_id,
                new_status="completed"
            )

    def handle_ride_cancelled(self, event_data: Dict[str, Any]):
        ride_request_id = event_data.get('ride_request_id')
        if ride_request_id:
            self._retry_db_operation(
                TripService.update_trip_status_by_request_id,
                f"Ride cancelled [{ride_request_id}]",
                ride_request_id=ride_request_id,
                new_status="cancelled"
            )

    def handle_trip_status_updated(self, event_data: Dict[str, Any]):
        trip_id = event_data.get('trip_id')
        new_status = event_data.get('new_status')
        if not trip_id or not new_status:
            logger.warning(f"Missing trip_id or new_status: {event_data}")
            return
        logger.info(f"Processing trip.status_updated → Trip: {trip_id}, Status: {new_status}")
        if new_status == 'completed':
            self._process_trip_payment(trip_id)

    def _process_trip_payment(self, trip_id: str):
        # ... (unchanged) — add your payment logic here if needed
        pass

    def handle_trip_payment_processed(self, event_data: Dict[str, Any]):
        trip_id = event_data.get('trip_id')
        driver_id = event_data.get('driver_id')
        amount = event_data.get('driver_payment')
        logger.info(f"Payment processed: Driver {driver_id} earned ₦{amount} for trip {trip_id}")


# ===================================================================
# START LISTENER
# ===================================================================
def start_event_listener():
    def listener_loop():
        handler = EventHandler()
        pubsub = redis_client.get_pubsub()
        pubsub.subscribe(RIDE_REQUEST_CHANNEL)
        pubsub.subscribe(TRIP_UPDATES_CHANNEL)
        logger.info(f"Subscribed to: {RIDE_REQUEST_CHANNEL}, {TRIP_UPDATES_CHANNEL}")

        while True:
            try:
                message = pubsub.get_message(timeout=10.0)
                if message and message.get("type") == "message":
                    channel = message["channel"]
                    if isinstance(channel, bytes):
                        channel = channel.decode()

                    data_raw = message["data"]
                    data_str = data_raw.decode() if isinstance(data_raw, bytes) else data_raw

                    try:
                        data = json.loads(data_str)
                        handler.handle_event(channel, data)
                    except json.JSONDecodeError as e:
                        logger.error(f"Invalid JSON: {data_str[:200]} | {e}")
                else:
                    time.sleep(0.001)
            except Exception as e:
                logger.critical(f"Listener crashed: {e}. Reconnecting...", exc_info=True)
                time.sleep(5)
                pubsub = redis_client.get_pubsub()
                pubsub.subscribe(RIDE_REQUEST_CHANNEL)
                pubsub.subscribe(TRIP_UPDATES_CHANNEL)

    thread = threading.Thread(target=listener_loop, daemon=True)
    thread.start()
    logger.info("Redis event listener STARTED — fixed & clean")