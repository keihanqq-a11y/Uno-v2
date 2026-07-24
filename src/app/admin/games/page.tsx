"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Panel } from "@/components/ui/Panel";

export default function AdminGamesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<{
    liveGames: Array<{ id: string; phase: string; players: number }>;
    liveLobbies: Array<{ code: string; status: string; players: number; maxPlayers: number; mode: string }>;
    recent: Array<{ id: string; status: string; playerCount: number; createdAt: string }>;
  } | null>(null);

  useEffect(() => {
    if (!loading && (!user || (user.role !== "ADMIN" && user.role !== "MODERATOR"))) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    void fetch("/api/admin/games")
      .then((r) => r.json())
      .then(setData);
  }, [user]);

  if (loading || !user || !data) return <div className="p-10 text-muted">Loading…</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 animate-fade-up">
      <h1 className="font-display text-3xl text-gold">Game management</h1>

      <section className="mt-8">
        <h2 className="text-sm uppercase tracking-wider text-muted">Live lobbies</h2>
        <div className="mt-3 space-y-2">
          {data.liveLobbies.map((l) => (
            <Panel key={l.code} className="flex justify-between p-4 text-sm">
              <span className="tracking-widest text-gold">{l.code}</span>
              <span className="text-muted">
                {l.mode} · {l.players}/{l.maxPlayers} · {l.status}
              </span>
            </Panel>
          ))}
          {!data.liveLobbies.length && <p className="text-sm text-muted">None</p>}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm uppercase tracking-wider text-muted">Live games</h2>
        <div className="mt-3 space-y-2">
          {data.liveGames.map((g) => (
            <Panel key={g.id} className="flex justify-between p-4 text-sm">
              <span className="font-mono text-xs">{g.id}</span>
              <span className="text-muted">
                {g.phase} · {g.players}p
              </span>
            </Panel>
          ))}
          {!data.liveGames.length && <p className="text-sm text-muted">None</p>}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm uppercase tracking-wider text-muted">Recent finished</h2>
        <div className="mt-3 space-y-2">
          {data.recent.map((g) => (
            <Panel key={g.id} className="flex justify-between p-4 text-sm">
              <span className="font-mono text-xs">{g.id.slice(0, 10)}…</span>
              <span className="text-muted">
                {g.playerCount}p · {new Date(g.createdAt).toLocaleString()}
              </span>
            </Panel>
          ))}
        </div>
      </section>
    </div>
  );
}
