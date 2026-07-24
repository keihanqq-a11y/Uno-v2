"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Panel } from "@/components/ui/Panel";

const links = [
  { href: "/admin/users", label: "Users", desc: "Ban, roles, search" },
  { href: "/admin/games", label: "Games", desc: "Live lobbies and history" },
  { href: "/admin/reports", label: "Reports", desc: "Player reports" },
  { href: "/admin/tickets", label: "Tickets", desc: "Support inbox" },
  { href: "/admin/chat", label: "Chat", desc: "Moderation" },
  { href: "/admin/analytics", label: "Analytics", desc: "Usage metrics" },
];

export default function AdminHome() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<{ users: number; games: number; activeUsers: number } | null>(
    null,
  );

  useEffect(() => {
    if (!loading && (!user || (user.role !== "ADMIN" && user.role !== "MODERATOR"))) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    void fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((d) => setStats(d.totals ?? null))
      .catch(() => undefined);
  }, [user]);

  if (loading || !user) return <div className="p-10 text-muted">Loading…</div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 animate-fade-up">
      <p className="text-[10px] uppercase tracking-[0.28em] text-muted">Administration</p>
      <h1 className="mt-2 font-display text-4xl text-gold">Control room</h1>

      {stats && (
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Panel className="p-5">
            <p className="text-xs text-muted">Users</p>
            <p className="mt-1 font-display text-3xl text-gold">{stats.users}</p>
          </Panel>
          <Panel className="p-5">
            <p className="text-xs text-muted">Finished games</p>
            <p className="mt-1 font-display text-3xl text-gold">{stats.games}</p>
          </Panel>
          <Panel className="p-5">
            <p className="text-xs text-muted">Active (7d)</p>
            <p className="mt-1 font-display text-3xl text-gold">{stats.activeUsers}</p>
          </Panel>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((l) => (
          <Link key={l.href} href={l.href}>
            <Panel className="h-full p-6 transition-colors hover:border-gold/40">
              <p className="text-lg">{l.label}</p>
              <p className="mt-1 text-sm text-muted">{l.desc}</p>
            </Panel>
          </Link>
        ))}
      </div>
    </div>
  );
}
