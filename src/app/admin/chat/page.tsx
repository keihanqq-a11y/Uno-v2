"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";

export default function AdminChatPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<
    Array<{ id: string; content: string; user?: { username: string } | null; createdAt: string }>
  >([]);

  const load = async () => {
    const res = await fetch("/api/admin/chat");
    if (res.ok) setMessages((await res.json()).messages ?? []);
  };

  useEffect(() => {
    if (!loading && (!user || (user.role !== "ADMIN" && user.role !== "MODERATOR"))) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user) void load();
  }, [user]);

  const moderate = async (messageId: string, content: string) => {
    await fetch("/api/admin/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, content, reason: "policy", action: "delete" }),
    });
    await load();
  };

  if (loading || !user) return <div className="p-10 text-muted">Loading…</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 animate-fade-up">
      <h1 className="font-display text-3xl text-gold">Chat moderation</h1>
      <div className="mt-6 space-y-2">
        {messages.map((m) => (
          <Panel key={m.id} className="flex items-center justify-between gap-4 p-4 text-sm">
            <div>
              <p className="text-xs text-muted">@{m.user?.username ?? "system"}</p>
              <p>{m.content}</p>
            </div>
            <Button size="sm" variant="danger" onClick={() => void moderate(m.id, m.content)}>
              Remove
            </Button>
          </Panel>
        ))}
        {!messages.length && <p className="text-sm text-muted">No persisted chat messages.</p>}
      </div>
    </div>
  );
}
