from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flasgger import Swagger
from prometheus_client import generate_latest, REGISTRY
import logging
import os

from config import Config
from routes.trips import trips_bp       
from routes.fares import fares_bp
from routes.analytics import analytics_bp
from services.trip_service import TripService   
from events.event_handlers import start_event_listener

# ========================
# Logging Configuration
# ========================
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)-8s] %(name)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logging.getLogger('werkzeug').setLevel(logging.WARN)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# ========================
# Automated Swagger Setup
# ========================
# This configures how the UI looks and where it lives
app.config['SWAGGER'] = {
    'title': 'Trip & Fare Core Service API',
    'uiversion': 3,
    'openapi': '3.0.1'
}

swagger_config = {
    "headers": [],
    "specs": [
        {
            "endpoint": 'apispec',
            "route": '/apispec.json',
            "rule_filter": lambda rule: True,  # include all routes
            "model_filter": lambda tag: True,  # include all models
        }
    ],
    "static_url_path": "/flasgger_static",
    "swagger_ui": True,
    "specs_route": "/api-docs/" # This is where you will view the docs
}

# Initialize Flasgger
swagger = Swagger(app, config=swagger_config)

# ========================
# CORS Configuration
# ========================
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": "*",
            "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
            "supports_credentials": True
        }
    }
)

# ========================
# Register Blueprints
# ========================
app.register_blueprint(trips_bp, url_prefix='/api')       
app.register_blueprint(fares_bp, url_prefix='/api')
app.register_blueprint(analytics_bp, url_prefix='/api')

# ========================
# Core Routes (Documented)
# ========================

@app.route('/')
def root():
    """
    Service Root
    ---
    responses:
      200:
        description: Returns service status and version
    """
    return jsonify({
        "message": "Trip & Fare Core Service is running",
        "status": "healthy",
        "version": "1.0.0",
        "docs": "/api-docs/"
    })

@app.route('/health')
def health_check():
    """
    Health Check
    ---
    responses:
      200:
        description: Service is healthy
    """
    return jsonify({"status": "healthy", "service": "trip-fare-core"})

@app.route("/api/trips/driver/<driver_id>/active", methods=["GET"])
def get_active_trip_by_driver_id(driver_id: str):
    """
    Get Active Trip for Driver
    ---
    parameters:
      - name: driver_id
        in: path
        type: string
        required: true
        description: The ID of the driver
      - name: Authorization
        in: header
        type: string
        required: true
        description: Bearer <JWT_TOKEN>
    responses:
      200:
        description: Successful operation
      401:
        description: Unauthorized
      500:
        description: Internal server error
    """
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"error": "Unauthorized – Bearer token required"}), 401

    try:
        trip = TripService.get_active_trip_for_driver(driver_id)
        if not trip:
            return jsonify({
                "success": True,
                "data": {"trip": None},
                "message": "No active trip found for driver"
            }), 200

        return jsonify({"success": True, "data": {"trip": trip}}), 200
    except Exception as e:
        logger.exception(f"Error fetching active trip for driver {driver_id}")
        return jsonify({"error": "Internal server error"}), 500

# ========================
# Debug & Metrics
# ========================

@app.route('/test-db')
def test_db():
    """
    Database Connection Test
    ---
    responses:
      200:
        description: Database version info
    """
    try:
        from utils.database import get_db_connection
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT version();")
            version = cur.fetchone()[0]
        conn.close()
        return jsonify({"status": "connected", "postgresql_version": version})
    except Exception as e:
        logger.error(f"DB test failed: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/metrics')
def metrics():
    """
    Prometheus Metrics
    ---
    responses:
      200:
        description: Plaintext metrics for Prometheus
    """
    return generate_latest(REGISTRY), 200, {'Content-Type': 'text/plain; version=0.0.4'}

# ========================
# Start Redis Listener
# ========================
logger.info("Starting Redis event listener in background...")
try:
    start_event_listener()
    logger.info("Redis event listener STARTED successfully")
except Exception as e:
    logger.critical(f"Failed to start Redis listener: {e}", exc_info=True)
    raise

# ========================
# Run App
# ========================
if __name__ == '__main__':
    # With Flasgger, we don't strictly need the static folder for Swagger anymore,
    # but we'll keep it for other static assets if needed.
    os.makedirs('static', exist_ok=True)
    app.run(host='0.0.0.0', port=3005, debug=False)