'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/store/authStore';

type MessageHandler = (data: any) => void;

interface WSContext {
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  role: 'rider' | 'driver' | null;
  currentRideId: string | null;
  setCurrentRideId: (id: string | null) => void;
  send: (msg: any) => void;
  on: (handler: MessageHandler) => () => void;
}

const WebSocketContext = createContext<WSContext | null>(null);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const ws = useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [currentRideId, setCurrentRideId] = useState<string | null>(null);
  const handlers = useRef<Set<MessageHandler>>(new Set());
  const role = user?.userType === 'driver' ? 'driver' : user?.userType === 'rider' ? 'rider' : null;

  const send = (msg: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(msg));
      console.log(`WS SENT [${role?.toUpperCase()}] →`, msg);
    }
  };

  const on = (handler: MessageHandler) => {
    handlers.current.add(handler);
    return () => handlers.current.delete(handler);
  };

  useEffect(() => {
    if (!user?.id || !role) return;

    const base = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3004';
    const tokenParam = role === 'driver' && token ? `&token=${token}` : '';
    const url = `${base}/ws?user_id=${user.id}&role=${role}${tokenParam}`;

    console.log(`WS CONNECTING [${role.toUpperCase()}] to:`, url);
    const socket = new WebSocket(url);
    ws.current = socket;

    socket.onopen = () => {
      console.log(`✅ GLOBAL ${role.toUpperCase()} WS CONNECTED`);
      setConnectionStatus('connected');
      
      // CRITICAL: Drivers need to send "driver.ready" message
      if (role === 'driver') {
        console.log('🚗 Driver sending ready message...');
        socket.send(JSON.stringify({
          type: 'driver.ready',
          driver_id: user.id,
          timestamp: new Date().toISOString()
        }));
      }
      
      if (role === 'rider' && currentRideId) {
        send({ type: 'subscribe_ride_status', ride_request_id: currentRideId });
      }
    };

    socket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log(`📩 WS RECEIVED [${role?.toUpperCase()}]:`, data);
        handlers.current.forEach(h => h(data));
      } catch (err) {
        console.error('Failed to parse WS message:', err);
      }
    };

    socket.onerror = (error) => {
      console.error(`❌ WS ERROR [${role?.toUpperCase()}]:`, error);
    };

    socket.onclose = (e) => {
      console.log(`🔌 GLOBAL ${role?.toUpperCase()} WS CLOSED`, e.code, e.reason);
      setConnectionStatus('disconnected');
      if (e.code !== 1000) {
        console.log(`🔄 Reconnecting ${role} in 3 seconds...`);
        setTimeout(() => {
          if (ws.current === socket) {
            console.log(`🔄 Attempting to reconnect ${role}...`);
            ws.current = new WebSocket(url);
          }
        }, 3000);
      }
    };

    return () => {
      console.log(`🧹 Cleaning up ${role} WebSocket`);
      if (socket.readyState === WebSocket.OPEN) {
        socket.close(1000, 'Component unmounting');
      }
    };
  }, [user?.id, role, token]);

  useEffect(() => {
    if (role === 'rider' && currentRideId && connectionStatus === 'connected') {
      send({ type: 'subscribe_ride_status', ride_request_id: currentRideId });
    }
  }, [currentRideId, connectionStatus, role]);

  return (
    <WebSocketContext.Provider value={{ connectionStatus, role, currentRideId, setCurrentRideId, send, on }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export const useWS = () => {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error('useWS must be used within WebSocketProvider');
  return ctx;
};