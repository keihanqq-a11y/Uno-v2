"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: "USER" | "MODERATOR" | "ADMIN";
  level: number;
  xp: number;
  emailVerified: boolean;
  balanceUsd: number;
  guestKey?: string | null;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setBalance: (balanceUsd: number) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const GUEST_KEY = "unox_guest_key";

function readGuestKey(): string | null {
  try {
    return localStorage.getItem(GUEST_KEY);
  } catch {
    return null;
  }
}

function writeGuestKey(key: string | null | undefined) {
  if (!key) return;
  try {
    localStorage.setItem(GUEST_KEY, key);
  } catch {
    /* ignore */
  }
}

async function ensureGuest(): Promise<User> {
  const guest = await fetch("/api/auth/guest", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guestKey: readGuestKey() }),
  });
  const data = await guest.json().catch(() => ({}));
  if (!guest.ok || !data.user) {
    throw new Error(data.error ?? "Could not start guest session. Is the database set up?");
  }
  writeGuestKey(data.user.guestKey);
  return data.user as User;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await ensureGuest();
      writeGuestKey(next.guestKey);
      setUser({ ...next, balanceUsd: Number(next.balanceUsd) || 0 });
    } catch (e) {
      setUser(null);
      setError(e instanceof Error ? e.message : "Failed to start");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const setBalance = (balanceUsd: number) => {
    setUser((prev) => (prev ? { ...prev, balanceUsd } : prev));
  };

  const logout = async () => {
    // Keep guestKey so returning still restores the same player.
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setLoading(true);
    await refresh();
    window.location.href = "/play";
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, refresh, setBalance, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
