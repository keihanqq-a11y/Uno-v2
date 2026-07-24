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
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function ensureGuest(): Promise<User | null> {
  const me = await fetch("/api/auth/me");
  if (me.ok) {
    const data = await me.json();
    return data.user ?? null;
  }

  const guest = await fetch("/api/auth/guest", { method: "POST" });
  if (!guest.ok) return null;
  const data = await guest.json();
  return data.user ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const next = await ensureGuest();
      setUser(next);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    // Immediately start a fresh guest session instead of forcing login
    setLoading(true);
    await refresh();
    window.location.href = "/play";
  };

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
