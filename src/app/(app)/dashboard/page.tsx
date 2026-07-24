"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { xpForLevel } from "@/lib/utils";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/play");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted">
        Starting guest session…
      </div>
    );
  }

  const next = xpForLevel(user.level + 1);
  const prev = xpForLevel(user.level);
  const progress = Math.min(100, ((user.xp - prev) / Math.max(1, next - prev)) * 100);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 animate-fade-up">
      <p className="text-[10px] uppercase tracking-[0.28em] text-muted">Welcome back</p>
      <h1 className="mt-2 font-display text-4xl text-gold">{user.displayName}</h1>
      <p className="mt-2 text-muted">
        Level {user.level} · {user.xp} XP
      </p>

      <div className="mt-4 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-border">
        <div className="h-full bg-gold transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <Panel className="p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Play</p>
          <p className="mt-2 text-sm text-muted">Private lobbies or public matchmaking.</p>
          <Link href="/play" className="mt-6 inline-block">
            <Button>Open table</Button>
          </Link>
        </Panel>
        <Panel className="p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Friends</p>
          <p className="mt-2 text-sm text-muted">Invite players and manage requests.</p>
          <Link href="/friends" className="mt-6 inline-block">
            <Button variant="secondary">Friends</Button>
          </Link>
        </Panel>
        <Panel className="p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Standings</p>
          <p className="mt-2 text-sm text-muted">Wins, win rate, level, and XP.</p>
          <Link href="/leaderboard" className="mt-6 inline-block">
            <Button variant="secondary">Leaderboard</Button>
          </Link>
        </Panel>
      </div>

      {!user.emailVerified && (
        <Panel className="mt-6 border-gold/30 p-4 text-sm text-muted">
          Verify your email to secure the account. Check your inbox or{" "}
          <Link href="/verify-email" className="text-gold">
            verification status
          </Link>
          .
        </Panel>
      )}
    </div>
  );
}
