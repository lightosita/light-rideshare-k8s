# utils/redis_client.py
import redis
import json
import ssl
import logging
import time
from config import Config
from redis.exceptions import ConnectionError, TimeoutError
from typing import Callable, Any, Dict

logger = logging.getLogger(__name__)

# Long timeout for Pub/Sub listeners (prevents idle disconnects)
PUBSUB_TIMEOUT_SECONDS = 300


class RedisClient:
    """
    A robust Redis wrapper with auto-reconnect, proper timeouts,
    and support for both publishing and multi-channel subscribing.
    """
    def __init__(self):
        self.redis_url = Config.REDIS_URL
        self._client = None

    def _get_connection_kwargs(self, timeout=None):
        DEFAULT_TIMEOUT = getattr(Config, 'REDIS_TIMEOUT', 10)
        kwargs = {
            'decode_responses': True,
            'socket_timeout': timeout if timeout is not None else DEFAULT_TIMEOUT,
            'socket_connect_timeout': timeout if timeout is not None else DEFAULT_TIMEOUT,
        }
        if self.redis_url.startswith('rediss://'):
            kwargs['ssl_cert_reqs'] = ssl.CERT_NONE
        return kwargs

    def _raw_client(self):
        """Lazy-connect and return the main Redis client (for commands & publish)"""
        if self._client is None:
            try:
                kwargs = self._get_connection_kwargs()
                client = redis.from_url(self.redis_url, **kwargs)
                client.ping()
                logger.info(f"Redis client connected successfully with timeout={kwargs['socket_timeout']}s.")
                self._client = client
            except Exception as e:
                logger.critical(f"Failed to connect to Redis: {e}")
                raise
        return self._client

    # === Critical: This method was MISSING! ===
    def get_pubsub(self):
        """
        Returns a PubSub object from the main client.
        Used by the new multi-channel event listener (start_event_listener).
        """
        return self._raw_client().pubsub()

    # === Proxy command methods ===
    def set(self, name, value, ex=None, px=None, nx=False, xx=False):
        return self._raw_client().set(name, value, ex=ex, px=px, nx=nx, xx=xx)

    def get(self, name):
        return self._raw_client().get(name)

    def delete(self, name):
        return self._raw_client().delete(name)

    def publish(self, channel, message):
        return self._raw_client().publish(channel, message)

    # === High-level helpers ===
    def publish_event(self, channel: str, event_data: dict):
        """Serialize and publish JSON event with error handling"""
        try:
            payload = json.dumps(event_data, default=str)
            self.publish(channel, payload)
            logger.debug(f"Published to {channel}: {event_data.get('event')}")
        except Exception as e:
            logger.error(f"Failed to publish to {channel}: {e}", exc_info=True)

    def subscribe_to_events(self, channel: str, callback: Callable[[str, Dict[str, Any]], None]):
        """
        Legacy single-channel subscriber with auto-reconnect.
        Kept for backward compatibility — but we now prefer start_event_listener().
        """
        retry_delay = 5
        while True:
            self._raw_client()  # Ensure main client exists

            try:
                kwargs = self._get_connection_kwargs(timeout=PUBSUB_TIMEOUT_SECONDS)
                kwargs['decode_responses'] = False  # Need bytes for pubsub
                client = redis.from_url(self.redis_url, **kwargs)
                pubsub = client.pubsub()
                pubsub.subscribe(channel)
                logger.info(f"Subscribed to Redis channel: {channel}")

                for message in pubsub.listen():
                    if message and message.get('type') == 'message':
                        try:
                            ch = message['channel'].decode('utf-8')
                            data = json.loads(message['data'].decode('utf-8'))
                            callback(ch, data)
                        except (json.JSONDecodeError, UnicodeDecodeError) as e:
                            logger.error(f"Invalid message on {channel}: {e}")
                        except Exception as e:
                            logger.error(f"Callback error: {e}", exc_info=True)

            except (ConnectionError, TimeoutError, OSError) as e:
                logger.warning(f"PubSub connection lost: {e}. Reconnecting in {retry_delay}s...")
                time.sleep(retry_delay)
            except Exception as e:
                logger.critical(f"Permanent PubSub error: {e}", exc_info=True)
                break


# Global singleton instance
redis_client = RedisClient()