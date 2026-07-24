"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

let shared: Socket | null = null;

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!shared) {
      shared = io({
        path: "/api/socketio",
        withCredentials: true,
        autoConnect: true,
      });
    }
    socketRef.current = shared;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    shared.on("connect", onConnect);
    shared.on("disconnect", onDisconnect);
    if (shared.connected) setConnected(true);

    return () => {
      shared?.off("connect", onConnect);
      shared?.off("disconnect", onDisconnect);
    };
  }, []);

  const emit = useCallback(<T,>(event: string, payload?: unknown): Promise<T> => {
    return new Promise((resolve, reject) => {
      const s = socketRef.current;
      if (!s) return reject(new Error("Socket not ready"));
      s.emit(event, payload ?? {}, (res: T) => resolve(res));
    });
  }, []);

  return { socket: socketRef.current, connected, emit };
}
