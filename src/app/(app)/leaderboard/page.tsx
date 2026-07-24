"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/utils";

interface Row {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  level: number;
  xp: number;
  wins: number;
  gamesPlayed: number;
  winRate: number;
}

const sorts = [
  { key: "wins", label: "Wins" },
  { key: "games", label: "Games" },
  { key: "winrate", label: "Win rate" },
  { key: "level", label: "Level" },
  { key: "xp", label: "XP" },
];

export default function LeaderboardPage() {
  const [sort, setSort] = useState("wins");
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    void fetch(`/api/leaderboard?sort=${sort}`)
      .then((r) => r.json())
      .then((d) => setRows(d.leaderboard ?? []));
  }, [sort]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 animate-fade-up">
      <p className="text-[10px] uppercase tracking-[0.28em] text-muted">Competition</p>
      <h1 className="mt-2 font-display text-4xl text-gold">Leaderboard</h1>

      <div className="mt-6 flex flex-wrap gap-2">
        {sorts.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSort(s.key)}
            className={cn(
              "h-9 rounded-md border px-3 text-xs tracking-wider",
              sort === s.key ? "border-gold text-gold" : "border-border text-muted",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <Panel className="mt-8 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-[10px] uppercase tracking-[0.16em] text-muted">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">Wins</th>
              <th className="px-4 py-3">Games</th>
              <th className="px-4 py-3">Rate</th>
              <th className="px-4 py-3">Level</th>
              <th className="px-4 py-3">XP</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="border-b border-border/50 hover:bg-white/[0.02]">
                <td className="px-4 py-3 text-muted">{i + 1}</td>
                <td className="px-4 py-3">
                  <Link href={`/profile/${r.username}`} className="hover:text-gold">
                    {r.displayName}
                  </Link>
                </td>
                <td className="px-4 py-3">{r.wins}</td>
                <td className="px-4 py-3">{r.gamesPlayed}</td>
                <td className="px-4 py-3">{r.winRate}%</td>
                <td className="px-4 py-3 text-gold">{r.level}</td>
                <td className="px-4 py-3">{r.xp}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <p className="p-8 text-center text-sm text-muted">No ranked players yet.</p>
        )}
      </Panel>
    </div>
  );
}
