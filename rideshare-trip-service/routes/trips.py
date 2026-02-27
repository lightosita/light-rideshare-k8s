from flask import Blueprint, request, jsonify
import logging
import json
from utils.database import get_db_connection
from services.trip_service import TripService

logger = logging.getLogger(__name__)

# ONE AND ONLY trips blueprint
trips_bp = Blueprint('trips', __name__, url_prefix='')  # /api prefix added in app.py


# ==============================================
# 1. Create Trip
# ==============================================
@trips_bp.route('/trips', methods=['POST'])
def create_trip():
    """
    Create a new trip record
    ---
    tags:
      - Trips
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [ride_request_id, driver_id, rider_id, pickup_lat, dropoff_lat]
          properties:
            ride_request_id: {type: string}
            driver_id: {type: string}
            rider_id: {type: string}
            pickup_lat: {type: number}
            pickup_lng: {type: number}
            dropoff_lat: {type: number}
            dropoff_lng: {type: number}
    responses:
      201:
        description: Trip created successfully
      400:
        description: Missing required fields
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        required_fields = ['ride_request_id', 'driver_id', 'rider_id', 'pickup_lat', 'dropoff_lat']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        trip_id = TripService.create_trip_from_event(data)
        if not trip_id:
            return jsonify({"error": "Failed to create trip"}), 500

        return jsonify({"message": "Trip created successfully", "trip_id": trip_id}), 201

    except Exception as e:
        logger.error(f"Error creating trip: {e}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500


# ==============================================
# 1b. Accept Ride Request
# ==============================================
@trips_bp.route('/ride-requests/<string:ride_request_id>/accept', methods=['POST'])
def accept_ride_request(ride_request_id):
    """
    Accept a ride request and convert it to a trip
    ---
    tags:
      - Trips
    parameters:
      - name: ride_request_id
        in: path
        type: string
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [driverId]
          properties:
            driverId: {type: string}
    responses:
      200:
        description: Ride request accepted and trip created
      404:
        description: Ride request not found
    """
    try:
        data = request.get_json()
        driver_id = data.get('driverId') or data.get('driver_id')
        
        if not driver_id:
            return jsonify({"success": False, "error": "driverId is required"}), 400

        req_details, error_msg = TripService.get_ride_request_from_db(ride_request_id)
        
        if not req_details:
             return jsonify({"success": False, "error": error_msg or "Ride request not found"}), 404

        # Fix: If req_details is a dictionary, update it. If it's a tuple, you'd need to convert to dict first.
        if isinstance(req_details, dict):
            req_details['driver_id'] = driver_id
        else:
            logger.error(f"req_details is {type(req_details)}, expected dict.")
            return jsonify({"success": False, "error": "Data format error from DB"}), 500

        trip_id = TripService.create_trip_from_event(req_details)
        if not trip_id:
            return jsonify({"success": False, "error": "Failed to create trip"}), 500
            
        trip = TripService.get_trip_details_by_id(trip_id)

        return jsonify({
            "success": True, 
            "data": {"trip": trip}
        }), 200

    except Exception as e:
        logger.error(f"Error accepting ride request {ride_request_id}: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


# ==============================================
# 2. Get Active Trip (by driver_id)
# ==============================================
@trips_bp.route('/trips/active', methods=['POST'])
def get_active_trip():
    """
    Get current active trip for a driver
    ---
    tags:
      - Trips
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [driver_id]
          properties:
            driver_id: {type: string}
    responses:
      200:
        description: Returns trip object
      404:
        description: No active trip found
    """
    try:
        data = request.get_json()
        if not data or 'driver_id' not in data:
            return jsonify({"error": "driver_id is required"}), 400

        trip = TripService.get_active_trip_for_driver(data['driver_id'])
        if not trip:
            return jsonify({"error": "No active trip found"}), 404

        return jsonify(trip), 200

    except Exception as e:
        logger.error(f"Error getting active trip: {e}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500


# ==============================================
# 3. Get Trip by ID
# ==============================================
@trips_bp.route('/trips/<string:trip_id>', methods=['GET'])
def get_trip(trip_id):
    """
    Get trip details by trip_id
    ---
    tags:
      - Trips
    parameters:
      - name: trip_id
        in: path
        type: string
        required: true
    responses:
      200:
        description: Trip details found
    """
    try:
        trip_data = TripService.get_trip_details_by_id(trip_id)
        if not trip_data:
            return jsonify({"success": False, "error": "Trip not found"}), 404

        return jsonify({"success": True, "data": {"trip": trip_data}}), 200

    except Exception as e:
        logger.error(f"Error fetching trip {trip_id}: {e}", exc_info=True)
        return jsonify({"success": False, "error": "Internal server error"}), 500


# ==============================================
# 4. Update Status by Request ID
# ==============================================
@trips_bp.route('/trips/request/<string:ride_request_id>/status', methods=['PUT'])
def update_trip_status(ride_request_id):
    """
    Update trip status using the original ride_request_id
    ---
    tags:
      - Trips
    parameters:
      - name: ride_request_id
        in: path
        type: string
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [status]
          properties:
            status: {type: string, example: "started"}
    responses:
      200:
        description: Status updated
    """
    try:
        data = request.get_json()
        if not data or 'status' not in data:
            return jsonify({"error": "status field is required"}), 400

        result = TripService.update_trip_status_by_request_id(ride_request_id, data['status'])
        if not result:
            return jsonify({"error": "Trip not found or invalid status"}), 404

        return jsonify({"message": "Status updated", "trip_id": result["id"]}), 200

    except Exception as e:
        logger.error(f"Error updating status for {ride_request_id}: {e}", exc_info=True)
        return jsonify({"error": "Internal server error"}), 500


# ==============================================
# DRIVER STATUS ENDPOINTS (Simplified for Driver App)
# ==============================================

@trips_bp.route("/trips/driver/mark-arrived", methods=["POST"])
def driver_mark_arrived():
    """
    Notify that driver has arrived at pickup
    ---
    tags:
      - Driver Actions
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required: [ride_request_id]
          properties:
            ride_request_id: {type: string}
    """
    data = request.get_json(silent=True) or {}
    ride_request_id = data.get("ride_request_id")
    if not ride_request_id:
        return jsonify({"error": "ride_request_id is required"}), 400

    result = TripService.mark_trip_arrived(ride_request_id)
    if not result:
        return jsonify({"error": "Trip not found or already arrived"}), 404

    return jsonify({
        "success": True,
        "message": "Driver has arrived at pickup",
        "trip_id": result["id"],
        "status": "arrived"
    }), 200


@trips_bp.route("/trips/driver/mark-started", methods=["POST"])
def driver_mark_started():
    """
    Start the trip once passenger is inside
    ---
    tags:
      - Driver Actions
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required: [ride_request_id]
          properties:
            ride_request_id: {type: string}
    """
    data = request.get_json(silent=True) or {}
    ride_request_id = data.get("ride_request_id")
    if not ride_request_id:
        return jsonify({"error": "ride_request_id is required"}), 400

    result = TripService.mark_trip_started(ride_request_id)
    if not result:
        return jsonify({"error": "Trip not found or not arrived yet"}), 404

    return jsonify({
        "success": True,
        "message": "Trip started",
        "trip_id": result["id"],
        "status": "started"
    }), 200


@trips_bp.route("/trips/driver/mark-completed", methods=["POST"])
def driver_mark_completed():
    """
    Mark trip as completed
    ---
    tags:
      - Driver Actions
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required: [ride_request_id]
          properties:
            ride_request_id: {type: string}
    """
    data = request.get_json(silent=True) or {}
    ride_request_id = data.get("ride_request_id")
    if not ride_request_id:
        return jsonify({"error": "ride_request_id is required"}), 400

    result = TripService.mark_trip_completed(ride_request_id)
    if not result:
        return jsonify({"error": "Trip not found or not started"}), 404

    return jsonify({
        "success": True,
        "message": "Ride completed successfully",
        "trip_id": result["id"],
        "status": "completed"
    }), 200


# ==============================================
# DRIVER DASHBOARD & EARNINGS
# ==============================================
@trips_bp.route('/drivers/<string:driver_id>/trips', methods=['GET'])
def get_driver_all_trips(driver_id):
    """
    Get trip history for a driver
    ---
    tags:
      - Driver Dashboard
    parameters:
      - name: driver_id
        in: path
        type: string
        required: true
      - name: status
        in: query
        type: string
      - name: limit
        in: query
        type: integer
        default: 100
    """
    try:
        status = request.args.get('status')
        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)
        include_cancelled = request.args.get('include_cancelled', 'false').lower() == 'true'

        conn = get_db_connection()
        cursor = conn.cursor()

        query = """
            SELECT id, ride_request_id, status, rider_id, driver_id,
                   pickup_address, dropoff_address, vehicle_type,
                   estimated_fare, actual_fare, distance_km, duration_minutes,
                   started_at, completed_at, created_at, updated_at,
                   rider_name, rider_phone, rider_rating,
                   payment_status, driver_payment_amount, platform_commission,
                   payment_processed_at
            FROM trip_service.trips 
            WHERE driver_id = %s
        """
        params = [driver_id]

        if status:
            query += " AND status = %s"
            params.append(status)
        elif not include_cancelled:
            query += " AND status != 'cancelled'"

        query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        cursor.execute(query, params)
        rows = cursor.fetchall()

        trips = []
        for row in rows:
            trips.append({
                "trip_id": str(row[0]),
                "ride_request_id": str(row[1]),
                "status": row[2],
                "rider_id": str(row[3]),
                "driver_id": str(row[4]),
                "pickup_address": row[5] or "",
                "dropoff_address": row[6] or "",
                "vehicle_type": row[7] or "standard",
                "estimated_fare": float(row[8]) if row[8] else None,
                "actual_fare": float(row[9]) if row[9] else None,
                "distance_km": float(row[10]) if row[10] else None,
                "duration_minutes": row[11],
                "started_at": row[12].isoformat() if row[12] else None,
                "completed_at": row[13].isoformat() if row[13] else None,
                "created_at": row[14].isoformat(),
                "updated_at": row[15].isoformat(),
                "rider": {
                    "name": row[16] or "Passenger",
                    "phone": row[17],
                    "rating": float(row[18]) if row[18] else 4.8
                },
                "payment": {
                    "status": row[19],
                    "driver_amount": float(row[20]) if row[20] else None,
                    "commission": float(row[21]) if row[21] else None,
                    "processed_at": row[22].isoformat() if row[22] else None
                }
            })

        cursor.execute("SELECT COUNT(*) FROM trip_service.trips WHERE driver_id = %s", (driver_id,))
        total = cursor.fetchone()[0]
        conn.close()

        return jsonify({
            "success": True,
            "data": {
                "driver_id": driver_id,
                "trips": trips,
                "pagination": {"total": total, "limit": limit, "offset": offset}
            }
        })

    except Exception as e:
        logger.error(f"Error fetching trips for driver {driver_id}: {e}", exc_info=True)
        return jsonify({"success": False, "error": "Internal server error"}), 500


@trips_bp.route('/drivers/<string:driver_id>/earnings/summary', methods=['GET'])
def get_driver_earnings_summary(driver_id):
    """
    Get earnings summary for a driver
    ---
    tags:
      - Driver Dashboard
    parameters:
      - name: driver_id
        in: path
        type: string
        required: true
      - name: time_range
        in: query
        type: string
        enum: [today, week, month, year, all]
    """
    try:
        time_range = request.args.get('time_range', 'all')
        conn = get_db_connection()
        cursor = conn.cursor()

        time_filters = {
            'today': "AND DATE(payment_processed_at) = CURRENT_DATE",
            'week': "AND payment_processed_at >= CURRENT_DATE - INTERVAL '7 days'",
            'month': "AND payment_processed_at >= CURRENT_DATE - INTERVAL '30 days'",
            'year': "AND payment_processed_at >= CURRENT_DATE - INTERVAL '365 days'",
            'all': ""
        }
        time_filter = time_filters.get(time_range, "")

        cursor.execute(f"""
            SELECT 
                COUNT(*) as total_trips,
                COALESCE(SUM(actual_fare), 0),
                COALESCE(SUM(driver_payment_amount), 0),
                COALESCE(SUM(platform_commission), 0),
                COALESCE(AVG(actual_fare), 0),
                COALESCE(AVG(driver_payment_amount), 0),
                MIN(payment_processed_at),
                MAX(payment_processed_at)
            FROM trip_service.trips 
            WHERE driver_id = %s AND status = 'completed' AND payment_status = 'paid' {time_filter}
        """, (driver_id,))
        
        stats = cursor.fetchone() or (0, 0, 0, 0, 0, 0, None, None)

        cursor.execute("SELECT current_balance, total_earnings, last_payment_date FROM trip_service.driver_accounts WHERE driver_id = %s", (driver_id,))
        account = cursor.fetchone() or (0, 0, None)
        conn.close()

        return jsonify({
            "success": True,
            "data": {
                "statistics": {
                    "total_trips": int(stats[0]),
                    "total_earned": float(stats[1]),
                    "driver_earned": float(stats[2]),
                    "average_fare": float(stats[4])
                },
                "account": {
                    "current_balance": float(account[0]),
                    "total_earnings": float(account[1])
                }
            }
        }), 200
    except Exception as e:
        logger.error(f"Earnings summary error: {e}", exc_info=True)
        return jsonify({"success": False, "error": "Internal server error"}), 500


# Health check
@trips_bp.route("/health", methods=["GET"])
def trips_health():
    """
    Trips Blueprint Health Check
    ---
    tags:
      - Health
    """
    return jsonify({"status": "healthy", "blueprint": "trips"}), 200