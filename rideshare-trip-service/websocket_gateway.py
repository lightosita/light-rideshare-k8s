import logging
import os
import threading
import json
from urllib.parse import urlparse

from flask import Flask, request
from flask_sock import Sock 
import redis

# --- Configuration & Logging Setup ---
logger = logging.getLogger(__name__)
# Set to DEBUG to see all connection and routing logs
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

# Get Redis URL from Environment
REDIS_URL = os.environ.get("REDIS_URL")

if not REDIS_URL:
    logger.error("FATAL: REDIS_URL environment variable is not set. Using local fallback.")
    REDIS_URL = "redis://localhost:6379" 

# Parse the URL for connection parameters
try:
    url = urlparse(REDIS_URL)
    REDIS_HOST = url.hostname
    REDIS_PORT = url.port if url.port else 6379
    REDIS_PASSWORD = url.password
    REDIS_SSL = url.scheme == 'rediss'
         
    logger.info("Connecting to Redis at: %s:%s (SSL: %s)", REDIS_HOST, REDIS_PORT, REDIS_SSL)

except Exception as e:
    logger.error("FATAL: Failed to parse REDIS_URL. Error: %s", e)

# --- Flask & Redis Setup ---
app = Flask(__name__)
app.config['SOCK_SERVER_OPTIONS'] = {'ping_interval': 25} 
sock = Sock(app)

# Redis connection for listening to events
redis_client = redis.Redis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    password=REDIS_PASSWORD,
    ssl=REDIS_SSL,
    decode_responses=True,
    retry_on_timeout=True
)

# Dictionary to store active WebSocket connections: {user_id: socket}
CLIENT_SOCKETS = {}

# CRITICAL: Channels for Active Ride Tracking
ALLOWED_CHANNELS = [
    'rider:*',             # For direct messages (e.g., driver chat)
    'driver:*',            # For direct messages to drivers
    'trip_service.updates',  # For trip status changes (accepted, arrived, started, completed)
    'driver_location.updates', # For real-time GPS tracking 
] 

# --- Redis Listener Thread ---
def redis_listener():
    """Listens to Redis Pub/Sub channels and relays messages to clients."""
    pubsub = redis_client.pubsub()
    
    try:
        pubsub.psubscribe(*ALLOWED_CHANNELS) 
        logger.info("Redis listener started. Subscribing to: %s", ALLOWED_CHANNELS)
    except Exception as e:
        logger.error("Failed to connect to Redis on listener thread: %s", e)
        return

    for message in pubsub.listen():
        if message['type'] == 'pmessage' or message['type'] == 'message':
            try:
                channel = message['channel'] 
                data = message['data']
                
                event_data = json.loads(data)
                
                # Determine the target recipient (rider_id or driver_id)
                rider_id = event_data.get('rider_id')
                driver_id = event_data.get('driver_id')
                
                logger.debug("Received event payload from Redis. Rider ID: %s, Driver ID: %s", rider_id, driver_id)
                
                # Target the rider
                if rider_id and str(rider_id) in CLIENT_SOCKETS:
                    socket = CLIENT_SOCKETS[str(rider_id)]
                    socket.send(data)
                    logger.info("Relayed message to RIDER %s via %s", rider_id, channel)
                
                # Target the driver
                if driver_id and str(driver_id) in CLIENT_SOCKETS:
                    socket = CLIENT_SOCKETS[str(driver_id)]
                    socket.send(data)
                    logger.info("Relayed message to DRIVER %s via %s", driver_id, channel)
                    
            except json.JSONDecodeError:
                logger.warning("Received non-JSON message from Redis on channel %s: %s", channel, data)
            except Exception as e:
                logger.error("Error processing Redis message: %s", e)

threading.Thread(target=redis_listener, daemon=True).start()

# --- WebSocket Endpoint ---
@sock.route('/ws')
def ws_handler(ws):
    # User must provide a unique identifier and role (rider or driver)
    user_id = request.args.get('user_id')
    role = request.args.get('role')
    
    if not user_id or not role:
        ws.close(code=1008, reason="Missing user_id or role")
        return

    user_id_str = str(user_id)
    
    # Store the active socket connection
    CLIENT_SOCKETS[user_id_str] = ws
    logger.info("Client connected: %s (%s). Total active connections: %d", user_id_str, role, len(CLIENT_SOCKETS))
    
    try:
        # Keep the connection open
        while True:
            # Simple ping/pong mechanism to detect disconnects (handled by Flask-Sock options)
            data = ws.receive(timeout=3600) 
            if data is None: 
                break
                
            # Log inbound messages
            try:
                msg = json.loads(data)
                logger.info("Received inbound message from %s: %s", user_id_str, msg.get('type'))
            except json.JSONDecodeError:
                logger.warning("Received invalid JSON from client.")
                
    except Exception as e:
        logger.error("WebSocket error for user %s: %s", user_id_str, e)
    finally:
        if user_id_str in CLIENT_SOCKETS:
            del CLIENT_SOCKETS[user_id_str]
        logger.info("Client disconnected: %s. Total active connections: %d", user_id_str, len(CLIENT_SOCKETS))

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=3006, debug=True)
