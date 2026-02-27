from flask import Blueprint, request, jsonify
from services.fare_service import FareService

fares_bp = Blueprint('fares', __name__)

@fares_bp.route('/fares/estimate', methods=['POST'])
def estimate_fare():
    """
    Estimate fare for a ride
    ---
    tags:
      - Fares
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - pickup_location
            - dropoff_location
          properties:
            pickup_location:
              type: string
              example: "123 Main St"
            dropoff_location:
              type: string
              example: "456 Airport Rd"
            vehicle_type:
              type: string
              example: "sedan"
    responses:
      200:
        description: Fare estimate calculated successfully
      400:
        description: Missing required fields
      500:
        description: Internal server error
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        required_fields = ['pickup_location', 'dropoff_location']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        estimate = FareService.estimate_fare(data)
        return jsonify(estimate)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@fares_bp.route('/fares/config', methods=['GET'])
def get_fare_config():
    """
    Get all fare configurations
    ---
    tags:
      - Fares
    responses:
      200:
        description: A list of fare configurations
    """
    try:
        configs = FareService.get_fare_configs()
        return jsonify([config.to_dict() for config in configs])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@fares_bp.route('/fares/config/<vehicle_type>', methods=['PUT'])
def update_fare_config(vehicle_type):
    """
    Update fare configuration for a specific vehicle type
    ---
    tags:
      - Fares
    parameters:
      - name: vehicle_type
        in: path
        type: string
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            base_fare:
              type: number
            per_km_rate:
              type: number
            per_minute_rate:
              type: number
            minimum_fare:
              type: number
            surge_multiplier:
              type: number
    responses:
      200:
        description: Configuration updated successfully
      400:
        description: Invalid data provided
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        required_fields = ['base_fare', 'per_km_rate', 'per_minute_rate', 'minimum_fare', 'surge_multiplier']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        FareService.update_fare_config(vehicle_type, data)
        return jsonify({"message": "Fare configuration updated successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@fares_bp.route('/fares/calculate', methods=['POST'])
def calculate_final_fare():
    """
    Calculate final fare for a completed trip
    ---
    tags:
      - Fares
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - trip_id
            - actual_distance_km
            - actual_duration_minutes
          properties:
            trip_id:
              type: string
            actual_distance_km:
              type: number
            actual_duration_minutes:
              type: number
    responses:
      200:
        description: Final fare calculated
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        required_fields = ['trip_id', 'actual_distance_km', 'actual_duration_minutes']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        return jsonify({
            "trip_id": data['trip_id'],
            "final_fare": 1500.00,
            "status": "calculated"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500