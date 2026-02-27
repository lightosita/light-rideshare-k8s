from flask import Blueprint, request, jsonify
from services.trip_service import TripService
from datetime import datetime

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/analytics/summary', methods=['GET'])
def get_analytics_summary():
    """Get trip analytics summary"""
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if not start_date or not end_date:
            return jsonify({"error": "start_date and end_date are required"}), 400
        
        try:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        except ValueError:
            return jsonify({"error": "Invalid date format. Use ISO format"}), 400
        
        analytics = TripService.get_analytics(start_dt, end_dt)
        return jsonify(analytics)
    except Exception as e:
        return jsonify({"error": str(e)}), 500