"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Panel } from "@/components/ui/Panel";

interface Match {
  id: string;
  won: boolean;
  placement: number;
  playerCount: number;
  cardsLeft: number;
  xpEarned: number;
  createdAt: string;
}

export default function HistoryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);

  useEffect(() => {
    if (!loading && !user) router.refresh();
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    void fetch("/api/matches")
      .then((r) => r.json())
      .then((d) => setMatches(d.matches ?? []));
  }, [user]);

  if (loading || !user) return <div className="p-10 text-muted">Loading…</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 animate-fade-up">
      <p className="text-[10px] uppercase tracking-[0.28em] text-muted">Record</p>
      <h1 className="mt-2 font-display text-4xl text-gold">Match history</h1>

      <div className="mt-8 space-y-3">
        {matches.map((m) => (
          <Panel key={m.id} className="flex items-center justify-between p-4">
            <div>
              <p className={m.won ? "text-gold" : "text-text"}>
                {m.won ? "Victory" : "Defeat"} · #{m.placement} of {m.playerCount}
              </p>
              <p className="text-xs text-muted">
                {new Date(m.createdAt).toLocaleString()} · {m.cardsLeft} cards left
              </p>
            </div>
            <p className="text-sm text-gold">+{m.xpEarned} XP</p>
          </Panel>
        ))}
        {!matches.length && <p className="text-sm text-muted">No matches yet.</p>}
      </div>
    </div>
  );
}
