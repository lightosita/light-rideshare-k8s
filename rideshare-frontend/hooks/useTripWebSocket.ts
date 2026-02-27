import { useEffect, useCallback, useRef } from 'react';

const TRIP_WS_URL = process.env.NEXT_PUBLIC_TRIP_WS_URL || 'ws://localhost:3006';

export const useTripWebSocket = (
  riderId: string,
  onMessage: (data: any) => void
) => {
  const wsRef = useRef<WebSocket | null>(null);
  const callbackRef = useRef(onMessage);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    callbackRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    if (wsRef.current) {
      const state = wsRef.current.readyState;
      if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) {
        console.debug('[Trip WS] Already connected/connecting. Skipping.');
        return;
      }
      if (state === WebSocket.CLOSING) {
        console.debug('[Trip WS] Still closing — waiting...');
        return;
      }
    }

    const url = `${TRIP_WS_URL}/ws?user_id=${riderId}&role=rider`;
    console.log(`[Trip WS] Connecting → ${url}`);

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[Trip WS] Connected successfully');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        callbackRef.current(data);
      } catch (err) {
        console.error('[Trip WS] Parse error:', err, event.data);
      }
    };

    ws.onerror = (event) => {
      console.error('[Trip WS] WebSocket error:', event);

      // Use valid custom close code (4000 is safe)
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close(4000, 'Application error occurred');
      }
    };

    ws.onclose = (event) => {
      wsRef.current = null;

      if (event.wasClean && event.code === 1000) {
        console.log('[Trip WS] Clean close (intentional). No reconnect.');
        return;
      }

      // Only reconnect on abnormal closures (not 1000 or clean close)
      if (event.code !== 1000) {
        console.warn(`[Trip WS] Abnormal close (code ${event.code}). Reconnecting in 5s...`);
        reconnectTimeoutRef.current = setTimeout(connect, 5000);
      }
    };
  }, [riderId]);

  useEffect(() => {
    if (!riderId) return;

    connect();

    return () => {
      console.log('[Trip WS] Cleaning up on unmount');
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        wsRef.current.close(1000, 'Component unmount');
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current = null;
    };
  }, [riderId, connect]);

  return {};
};