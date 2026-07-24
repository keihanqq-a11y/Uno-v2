"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Panel } from "@/components/ui/Panel";

export default function AdminAnalyticsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<{
    totals: { users: number; games: number; activeUsers: number };
    events: Array<{ type: string; count: number }>;
  } | null>(null);

  useEffect(() => {
    if (!loading && (!user || (user.role !== "ADMIN" && user.role !== "MODERATOR"))) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    void fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then(setData);
  }, [user]);

  if (loading || !user || !data) return <div className="p-10 text-muted">Loading…</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 animate-fade-up">
      <h1 className="font-display text-3xl text-gold">Analytics</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Panel className="p-5">
          <p className="text-xs text-muted">Users</p>
          <p className="font-display text-3xl text-gold">{data.totals.users}</p>
        </Panel>
        <Panel className="p-5">
          <p className="text-xs text-muted">Games</p>
          <p className="font-display text-3xl text-gold">{data.totals.games}</p>
        </Panel>
        <Panel className="p-5">
          <p className="text-xs text-muted">Active 7d</p>
          <p className="font-display text-3xl text-gold">{data.totals.activeUsers}</p>
        </Panel>
      </div>
      <Panel className="mt-8 p-6">
        <h2 className="text-sm uppercase tracking-wider text-muted">Events (7d)</h2>
        <ul className="mt-4 space-y-2">
          {data.events.map((e) => (
            <li key={e.type} className="flex justify-between text-sm border-b border-border pb-2">
              <span>{e.type}</span>
              <span className="text-gold">{e.count}</span>
            </li>
          ))}
          {!data.events.length && <p className="text-sm text-muted">No events yet.</p>}
        </ul>
      </Panel>
    </div>
  );
}
