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

async function ensureGuest(): Promise<User> {
  const me = await fetch("/api/auth/me", { credentials: "include" });
  if (me.ok) {
    const data = await me.json();
    if (data.user) return data.user as User;
  }

  const guest = await fetch("/api/auth/guest", { method: "POST", credentials: "include" });
  const data = await guest.json().catch(() => ({}));
  if (!guest.ok || !data.user) {
    throw new Error(data.error ?? "Could not start guest session. Is the database set up?");
  }
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
    await fetch("/api/auth/logout", { method: "POST" });
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
