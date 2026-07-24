"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Panel } from "@/components/ui/Panel";

interface FriendRow {
  id: string;
  status: string;
  incoming: boolean;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    level: number;
  };
}

export default function FriendsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/friends");
    if (!res.ok) return;
    const data = await res.json();
    setFriends(data.friends ?? []);
  };

  useEffect(() => {
    if (!loading && !user) router.refresh();
  }, [loading, user, router]);

  useEffect(() => {
    if (user) void load();
  }, [user]);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed");
      return;
    }
    setUsername("");
    await load();
  };

  const act = async (id: string, action: string) => {
    await fetch("/api/friends", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    await load();
  };

  if (loading || !user) return <div className="p-10 text-muted">Loading…</div>;

  const accepted = friends.filter((f) => f.status === "ACCEPTED");
  const pending = friends.filter((f) => f.status === "PENDING");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 animate-fade-up">
      <p className="text-[10px] uppercase tracking-[0.28em] text-muted">Social</p>
      <h1 className="mt-2 font-display text-4xl text-gold">Friends</h1>

      <Panel className="mt-8 p-6">
        <form onSubmit={add} className="flex gap-2">
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            required
          />
          <Button type="submit">Add</Button>
        </form>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </Panel>

      {pending.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm uppercase tracking-[0.16em] text-muted">Pending</h2>
          <ul className="mt-4 space-y-3">
            {pending.map((f) => (
              <li key={f.id} className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <p>{f.user.displayName}</p>
                  <p className="text-xs text-muted">@{f.user.username}</p>
                </div>
                <div className="flex gap-2">
                  {f.incoming ? (
                    <>
                      <Button size="sm" onClick={() => void act(f.id, "accept")}>
                        Accept
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void act(f.id, "decline")}>
                        Decline
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => void act(f.id, "remove")}>
                      Cancel
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-sm uppercase tracking-[0.16em] text-muted">Friends list</h2>
        <ul className="mt-4 space-y-3">
          {accepted.map((f) => (
            <li key={f.id} className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <p>
                  {f.user.displayName}{" "}
                  <span className="text-xs text-gold">Lv {f.user.level}</span>
                </p>
                <p className="text-xs text-muted">@{f.user.username}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => void act(f.id, "remove")}>
                Remove
              </Button>
            </li>
          ))}
          {!accepted.length && <p className="text-sm text-muted">No friends yet.</p>}
        </ul>
      </section>
    </div>
  );
}
