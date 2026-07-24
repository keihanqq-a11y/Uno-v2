"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Panel } from "@/components/ui/Panel";

interface AdminUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: string;
  isBanned: boolean;
  wins: number;
  gamesPlayed: number;
  level: number;
}

export default function AdminUsersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);

  const load = async (query = q) => {
    const res = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users ?? []);
    }
  };

  useEffect(() => {
    if (!loading && (!user || (user.role !== "ADMIN" && user.role !== "MODERATOR"))) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user) void load("");
  }, [user]);

  const patch = async (id: string, action: string, extra?: Record<string, string>) => {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, ...extra }),
    });
    await load();
  };

  if (loading || !user) return <div className="p-10 text-muted">Loading…</div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 animate-fade-up">
      <h1 className="font-display text-3xl text-gold">User management</h1>
      <div className="mt-6 flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" />
        <Button onClick={() => void load()}>Search</Button>
      </div>
      <Panel className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-[10px] uppercase tracking-wider text-muted">
            <tr>
              <th className="px-3 py-3">User</th>
              <th className="px-3 py-3">Role</th>
              <th className="px-3 py-3">Stats</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border/50">
                <td className="px-3 py-3">
                  <p>{u.displayName}</p>
                  <p className="text-xs text-muted">
                    @{u.username} · {u.email}
                  </p>
                  {u.isBanned && <p className="text-xs text-danger">Banned</p>}
                </td>
                <td className="px-3 py-3">{u.role}</td>
                <td className="px-3 py-3 text-xs text-muted">
                  Lv {u.level} · {u.wins}W / {u.gamesPlayed}G
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1">
                    {u.isBanned ? (
                      <Button size="sm" variant="secondary" onClick={() => void patch(u.id, "unban")}>
                        Unban
                      </Button>
                    ) : (
                      <Button size="sm" variant="danger" onClick={() => void patch(u.id, "ban")}>
                        Ban
                      </Button>
                    )}
                    {user.role === "ADMIN" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          void patch(u.id, "role", {
                            role: u.role === "MODERATOR" ? "USER" : "MODERATOR",
                          })
                        }
                      >
                        Toggle mod
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
