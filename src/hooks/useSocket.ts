"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

let shared: Socket | null = null;

function socketUrl() {
  return process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001";
}

function getSocket() {
  if (!shared) {
    shared = io(socketUrl(), {
      path: "/api/socketio",
      withCredentials: true,
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 600,
    });
  }
  return shared;
}

function waitForConnect(socket: Socket, ms = 12000): Promise<void> {
  if (socket.connected) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Still connecting to game server…"));
    }, ms);

    const onConnect = () => {
      cleanup();
      resolve();
    };
    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };

    const cleanup = () => {
      clearTimeout(timer);
      socket.off("connect", onConnect);
      socket.off("connect_error", onError);
    };

    socket.on("connect", onConnect);
    socket.on("connect_error", onError);
    if (!socket.active) socket.connect();
  });
}

export function useSocket(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const [connected, setConnected] = useState(false);
  const [socketError, setSocketError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const authRetryRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setConnected(false);
      return;
    }

    const socket = getSocket();
    socketRef.current = socket;
    authRetryRef.current = 0;

    const onConnect = () => {
      setConnected(true);
      setSocketError(null);
      authRetryRef.current = 0;
    };
    const onDisconnect = () => setConnected(false);
    const onError = (err: Error) => {
      const msg = err.message || "Socket failed";
      // Cookie/session race: guest auth may finish after first handshake.
      if (/unauthorized/i.test(msg) && authRetryRef.current < 2) {
        authRetryRef.current += 1;
        void (async () => {
          try {
            await fetch("/api/auth/guest", { method: "POST", credentials: "include" });
          } catch {
            /* ignore */
          }
          window.setTimeout(() => {
            socket.disconnect();
            socket.connect();
          }, 250);
        })();
        return;
      }
      setSocketError(
        /unauthorized/i.test(msg)
          ? "Session expired — refresh the page."
          : msg,
      );
      setConnected(false);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onError);

    if (socket.connected) {
      setConnected(true);
    } else {
      socket.connect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onError);
    };
  }, [enabled]);

  const emit = useCallback(async <T,>(event: string, payload?: unknown): Promise<T> => {
    const s = getSocket();
    socketRef.current = s;
    if (!s.connected) s.connect();
    await waitForConnect(s);

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`No response for ${event}. Is the socket server running?`));
      }, 12000);

      s.emit(event, payload ?? {}, (res: T) => {
        clearTimeout(timer);
        resolve(res);
      });
    });
  }, []);

  return {
    socket: socketRef.current ?? shared,
    connected,
    socketError,
    emit,
  };
}
