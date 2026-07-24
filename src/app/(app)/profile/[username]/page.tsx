"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/utils";

interface Profile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  level: number;
  xp: number;
  wins: number;
  losses: number;
  gamesPlayed: number;
  winRate: number;
  loginStreak: number;
  badges: Array<{ badge: { name: string; color: string } }>;
  achievements: Array<{ achievement: { name: string } }>;
}

interface MatchRow {
  id: string;
  won: boolean;
  placement: number;
  playerCount: number;
  cardsLeft: number;
  xpEarned: number;
  lobbyCode: string | null;
  stakeUsd: number;
  createdAt: string;
  gameId: string;
}

interface TxRow {
  id: string;
  type: "DEPOSIT" | "WITHDRAW";
  status: string;
  amountUsd: number;
  assetSymbol: string | null;
  cryptoAmount: number | null;
  addressShort: string | null;
  txSignature: string | null;
  createdAt: string;
  explorerAccountUrl: string | null;
  explorerTxUrl: string | null;
  note: string | null;
}

type Tab = "overview" | "rounds" | "wallet";

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [txs, setTxs] = useState<TxRow[]>([]);

  const isSelf = user?.username === params.username;

  const load = async () => {
    const res = await fetch(`/api/profile?username=${params.username}`);
    if (!res.ok) return;
    const data = await res.json();
    setProfile(data.profile);
    setDisplayName(data.profile.displayName);
    setBio(data.profile.bio ?? "");
  };

  useEffect(() => {
    void load();
  }, [params.username]);

  useEffect(() => {
    if (!isSelf) return;
    void fetch("/api/matches?limit=40", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setMatches(d.matches ?? []))
      .catch(() => undefined);
    void fetch("/api/wallet/transactions?limit=40", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setTxs(d.transactions ?? []))
      .catch(() => undefined);
  }, [isSelf]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, bio }),
    });
    if (res.ok) {
      setMsg("Profile saved — this name stays when you come back");
      await load();
    }
  };

  const upload = async (file: File) => {
    const form = new FormData();
    form.append("avatar", file);
    const res = await fetch("/api/avatar", { method: "POST", body: form });
    if (res.ok) {
      setMsg("Avatar updated");
      await load();
    }
  };

  if (!profile) return <div className="p-10 text-muted">Loading…</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 animate-fade-up">
      <div className="flex items-start gap-6">
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-card text-2xl text-white">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            profile.displayName.slice(0, 1)
          )}
        </div>
        <div>
          <h1 className="font-display text-4xl text-white">{profile.displayName}</h1>
          <p className="text-muted">@{profile.username}</p>
          <p className="mt-2 text-sm text-muted">{profile.bio || "No bio yet."}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <span>
              <span className="text-red-400">{profile.wins}</span> wins
            </span>
            <span>
              <span className="text-red-400">{profile.gamesPlayed}</span> games
            </span>
            <span>
              <span className="text-red-400">{profile.winRate}%</span> win rate
            </span>
            <span>
              Lv <span className="text-red-400">{profile.level}</span>
            </span>
          </div>
        </div>
      </div>

      {isSelf && (
        <div className="mt-8 flex flex-wrap gap-2 border-b border-white/10 pb-3">
          {(
            [
              ["overview", "Overview"],
              ["rounds", "Game rounds"],
              ["wallet", "Deposits & withdraws"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "rounded-full px-4 py-2 text-sm transition",
                tab === id
                  ? "bg-red-500 text-white"
                  : "bg-white/5 text-zinc-400 hover:text-white",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {(!isSelf || tab === "overview") && (
        <>
          {isSelf && (
            <Panel className="mt-6 p-6">
              <h2 className="text-sm uppercase tracking-[0.16em] text-muted">Edit profile</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Your username and display name are saved on this device and in the database — they
                come back when you return.
              </p>
              <form onSubmit={save} className="mt-4 space-y-4">
                <div>
                  <Label htmlFor="dn">Display name</Label>
                  <Input
                    id="dn"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Input
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={280}
                  />
                </div>
                <div>
                  <Label htmlFor="avatar">Avatar</Label>
                  <Input
                    id="avatar"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void upload(f);
                    }}
                  />
                </div>
                <Button type="submit">Save</Button>
                {msg && <p className="text-sm text-success">{msg}</p>}
              </form>
              <Link href="/settings" className="mt-4 inline-block text-sm text-muted hover:text-white">
                Account settings
              </Link>
            </Panel>
          )}
        </>
      )}

      {isSelf && tab === "rounds" && (
        <Panel className="mt-6 overflow-hidden p-0">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-sm uppercase tracking-[0.16em] text-muted">
              Game rounds & lobbies
            </h2>
            <p className="mt-1 text-xs text-zinc-500">Match history, lobby codes, and results</p>
          </div>
          <ul className="divide-y divide-white/5">
            {matches.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-zinc-500">No rounds yet — play a match</li>
            )}
            {matches.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="text-sm text-white">
                    {m.won ? "Win" : "Loss"} · place #{m.placement} of {m.playerCount}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {m.lobbyCode ? `Lobby ${m.lobbyCode}` : "Quick match"}
                    {m.stakeUsd > 0 ? ` · stake $${m.stakeUsd.toFixed(2)}` : ""}
                    {" · "}+{m.xpEarned} XP
                  </p>
                </div>
                <p className="text-xs text-zinc-600">
                  {new Date(m.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {isSelf && tab === "wallet" && (
        <Panel className="mt-6 overflow-hidden p-0">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-sm uppercase tracking-[0.16em] text-muted">
              Deposit & withdraw history
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Opens Solscan / explorer for the wallet address used
            </p>
          </div>
          <ul className="divide-y divide-white/5">
            {txs.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-zinc-500">
                No transactions yet
              </li>
            )}
            {txs.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="text-sm text-white">
                    {t.type === "DEPOSIT" ? "Deposit" : "Withdraw"}{" "}
                    <span className={t.type === "DEPOSIT" ? "text-emerald-400" : "text-red-400"}>
                      {t.type === "DEPOSIT" ? "+" : "-"}${t.amountUsd.toFixed(2)}
                    </span>
                    {t.assetSymbol ? ` · ${t.assetSymbol}` : ""}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {t.addressShort ?? "—"}
                    {t.cryptoAmount != null ? ` · ${t.cryptoAmount}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {(t.explorerTxUrl || t.explorerAccountUrl) && (
                    <a
                      href={t.explorerTxUrl || t.explorerAccountUrl || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-white/15 px-3 py-1 text-[11px] uppercase tracking-wider text-zinc-300 hover:border-red-500/40 hover:text-white"
                    >
                      {t.assetSymbol === "SOL" ? "Solscan" : "Explorer"}
                    </a>
                  )}
                  <p className="text-xs text-zinc-600">
                    {new Date(t.createdAt).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
