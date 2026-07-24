"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

interface RewardsData {
  xp: number;
  level: number;
  nextLevelXp: number;
  loginStreak: number;
  lastDailyRewardAt: string | null;
  achievements: Array<{ achievement: { name: string; description: string; xpReward: number } }>;
  badges: Array<{ badge: { name: string; description: string; color: string } }>;
  catalog: Array<{ key: string; name: string; description: string }>;
}

export default function RewardsPage() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<RewardsData | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/rewards");
    if (res.ok) setData(await res.json());
  };

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (user) void load();
  }, [user]);

  const claim = async () => {
    const res = await fetch("/api/rewards", { method: "POST" });
    const body = await res.json();
    if (!res.ok) {
      setMessage(body.error ?? "Already claimed");
      return;
    }
    setMessage(`+${body.xpGained} XP · streak ${body.loginStreak}`);
    await refresh();
    await load();
  };

  if (loading || !user || !data) return <div className="p-10 text-muted">Loading…</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 animate-fade-up">
      <p className="text-[10px] uppercase tracking-[0.28em] text-muted">Progression</p>
      <h1 className="mt-2 font-display text-4xl text-gold">Rewards</h1>

      <Panel className="mt-8 p-6">
        <p className="text-sm text-muted">Daily login</p>
        <p className="mt-1 text-lg">
          Streak <span className="text-gold">{data.loginStreak}</span>
        </p>
        <Button className="mt-4" onClick={() => void claim()}>
          Claim daily XP
        </Button>
        {message && <p className="mt-3 text-sm text-muted">{message}</p>}
      </Panel>

      <section className="mt-8">
        <h2 className="text-sm uppercase tracking-[0.16em] text-muted">Achievements</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {data.catalog.map((a) => {
            const unlocked = data.achievements.some(
              (u) => u.achievement.name === a.name,
            );
            return (
              <Panel
                key={a.key}
                className={`p-4 ${unlocked ? "border-gold/40" : "opacity-60"}`}
              >
                <p className="text-sm">{a.name}</p>
                <p className="mt-1 text-xs text-muted">{a.description}</p>
              </Panel>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm uppercase tracking-[0.16em] text-muted">Badges</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {data.badges.map((b, i) => (
            <span
              key={i}
              className="rounded-md border px-3 py-1 text-xs"
              style={{ borderColor: b.badge.color, color: b.badge.color }}
            >
              {b.badge.name}
            </span>
          ))}
          {!data.badges.length && <p className="text-sm text-muted">No badges yet.</p>}
        </div>
      </section>
    </div>
  );
}
