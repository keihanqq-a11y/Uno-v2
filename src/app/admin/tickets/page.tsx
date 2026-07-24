"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Panel } from "@/components/ui/Panel";

interface Ticket {
  id: string;
  subject: string;
  status: string;
  user?: { username: string; displayName: string };
  messages: Array<{ id: string; content: string; isStaff: boolean; createdAt: string }>;
}

export default function AdminTicketsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const load = async () => {
    const res = await fetch("/api/admin/tickets");
    if (res.ok) setTickets((await res.json()).tickets ?? []);
  };

  useEffect(() => {
    if (!loading && (!user || (user.role !== "ADMIN" && user.role !== "MODERATOR"))) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user) void load();
  }, [user]);

  const send = async () => {
    if (!active || !reply.trim()) return;
    await fetch("/api/admin/tickets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: active, message: reply }),
    });
    setReply("");
    await load();
  };

  const resolve = async (id: string) => {
    await fetch("/api/admin/tickets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "RESOLVED" }),
    });
    await load();
  };

  if (loading || !user) return <div className="p-10 text-muted">Loading…</div>;
  const current = tickets.find((t) => t.id === active);

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-10 lg:grid-cols-[280px_1fr] animate-fade-up">
      <div>
        <h1 className="font-display text-3xl text-gold">Tickets</h1>
        <div className="mt-6 space-y-2">
          {tickets.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              className={`w-full rounded-md border p-3 text-left text-sm ${
                active === t.id ? "border-gold" : "border-border"
              }`}
            >
              <p>{t.subject}</p>
              <p className="text-xs text-muted">
                {t.user?.username} · {t.status}
              </p>
            </button>
          ))}
        </div>
      </div>
      <Panel className="p-6 min-h-[420px]">
        {!current ? (
          <p className="text-muted text-sm">Select a ticket</p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg">{current.subject}</h2>
              <Button size="sm" variant="secondary" onClick={() => void resolve(current.id)}>
                Resolve
              </Button>
            </div>
            <div className="mt-6 max-h-80 space-y-3 overflow-y-auto">
              {current.messages.map((m) => (
                <div key={m.id} className={`text-sm ${m.isStaff ? "text-gold" : "text-text"}`}>
                  <p className="text-[10px] uppercase tracking-wider text-muted">
                    {m.isStaff ? "Staff" : "User"}
                  </p>
                  <p>{m.content}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply…" />
              <Button onClick={() => void send()}>Send</Button>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
