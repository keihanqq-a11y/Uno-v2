"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

let shared: Socket | null = null;

function getSocket() {
  if (!shared) {
    shared = io({
      path: "/api/socketio",
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 500,
    });
  }
  return shared;
}

function waitForConnect(socket: Socket, ms = 8000): Promise<void> {
  if (socket.connected) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Socket connection timed out. Restart with: npm run dev"));
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

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const [socketError, setSocketError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const onConnect = () => {
      setConnected(true);
      setSocketError(null);
    };
    const onDisconnect = () => setConnected(false);
    const onError = (err: Error) => {
      setSocketError(err.message || "Socket failed");
      setConnected(false);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onError);
    if (socket.connected) setConnected(true);
    else if (!socket.active) socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onError);
    };
  }, []);

  const emit = useCallback(async <T,>(event: string, payload?: unknown): Promise<T> => {
    const s = getSocket();
    socketRef.current = s;
    await waitForConnect(s);

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`No response for ${event}. Is the server running via npm run dev?`));
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
