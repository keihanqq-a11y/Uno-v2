"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Panel } from "@/components/ui/Panel";

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

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

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

  const isSelf = user?.username === params.username;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, bio }),
    });
    if (res.ok) {
      setMsg("Profile updated");
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
    <div className="mx-auto max-w-3xl px-4 py-10 animate-fade-up">
      <div className="flex items-start gap-6">
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-gold/40 bg-card text-2xl text-gold">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            profile.displayName.slice(0, 1)
          )}
        </div>
        <div>
          <h1 className="font-display text-4xl text-gold">{profile.displayName}</h1>
          <p className="text-muted">@{profile.username}</p>
          <p className="mt-2 text-sm text-muted">{profile.bio || "No bio yet."}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <span>
              <span className="text-gold">{profile.wins}</span> wins
            </span>
            <span>
              <span className="text-gold">{profile.gamesPlayed}</span> games
            </span>
            <span>
              <span className="text-gold">{profile.winRate}%</span> win rate
            </span>
            <span>
              Lv <span className="text-gold">{profile.level}</span>
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.badges.map((b, i) => (
              <span
                key={i}
                className="rounded border px-2 py-0.5 text-[10px] uppercase tracking-wider"
                style={{ borderColor: b.badge.color, color: b.badge.color }}
              >
                {b.badge.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {isSelf && (
        <Panel className="mt-10 p-6">
          <h2 className="text-sm uppercase tracking-[0.16em] text-muted">Edit profile</h2>
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
              <Input id="bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={280} />
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
          <Link href="/settings" className="mt-4 inline-block text-sm text-muted hover:text-gold">
            Account settings
          </Link>
        </Panel>
      )}
    </div>
  );
}
