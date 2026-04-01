'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './api-client';

// Event types matching the backend EventsService
type SocketEventMap = {
  'prescription:update': Record<string, unknown>;
  'order:update': Record<string, unknown>;
  'chat:message': Record<string, unknown>;
  'complaint:new': Record<string, unknown>;
  subscribed: { joined: string[] };
  error: { message: string };
};

type SocketEventName = keyof SocketEventMap;

export interface RealtimeCounts {
  prescriptions: number;
  orders: number;
  chat: number;
  complaints: number;
}

interface SocketContextValue {
  /** Whether the socket is currently connected */
  connected: boolean;
  /** Real-time badge counts incremented by incoming events */
  counts: RealtimeCounts;
  /** Reset a specific counter (e.g. when user navigates to that page) */
  resetCount: (key: keyof RealtimeCounts) => void;
  /** Subscribe to a specific socket event */
  on: <E extends SocketEventName>(
    event: E,
    handler: (data: SocketEventMap[E]) => void,
  ) => () => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

const ROOMS = [
  'room:prescriptions',
  'room:orders',
  'room:chat',
  'room:complaints',
] as const;

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [counts, setCounts] = useState<RealtimeCounts>({
    prescriptions: 0,
    orders: 0,
    chat: 0,
    complaints: 0,
  });

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

    const socket = io(apiUrl, {
      path: '/ws',
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      // Subscribe to all rooms on connect/reconnect
      socket.emit('subscribe', [...ROOMS]);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // Increment badge counts on incoming events
    socket.on('prescription:update', () => {
      setCounts((prev) => ({ ...prev, prescriptions: prev.prescriptions + 1 }));
    });

    socket.on('order:update', () => {
      setCounts((prev) => ({ ...prev, orders: prev.orders + 1 }));
    });

    socket.on('chat:message', () => {
      setCounts((prev) => ({ ...prev, chat: prev.chat + 1 }));
    });

    socket.on('complaint:new', () => {
      setCounts((prev) => ({ ...prev, complaints: prev.complaints + 1 }));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const resetCount = useCallback((key: keyof RealtimeCounts) => {
    setCounts((prev) => ({ ...prev, [key]: 0 }));
  }, []);

  const on = useCallback(
    <E extends SocketEventName>(
      event: E,
      handler: (data: SocketEventMap[E]) => void,
    ): (() => void) => {
      const socket = socketRef.current;
      if (!socket) return () => {};
      socket.on(event as string, handler as (...args: unknown[]) => void);
      return () => {
        socket.off(event as string, handler as (...args: unknown[]) => void);
      };
    },
    [],
  );

  return (
    <SocketContext.Provider value={{ connected, counts, resetCount, on }}>
      {children}
    </SocketContext.Provider>
  );
}

/** Access the socket context. Must be used within a SocketProvider. */
export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return ctx;
}

/**
 * Hook to listen for specific socket events.
 * Automatically cleans up on unmount.
 */
export function useSocketEvent<E extends SocketEventName>(
  event: E,
  handler: (data: SocketEventMap[E]) => void,
): void {
  const { on } = useSocket();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const unsubscribe = on(event, (data) => handlerRef.current(data));
    return unsubscribe;
  }, [event, on]);
}
