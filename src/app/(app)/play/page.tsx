"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Panel } from "@/components/ui/Panel";

export default function PlayPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { connected, emit, socket } = useSocket();
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [mode, setMode] = useState<"PRIVATE" | "PUBLIC">("PRIVATE");
  const [code, setCode] = useState("");
  const [queueSize, setQueueSize] = useState(4);
  const [queueing, setQueueing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.refresh();
  }, [loading, user, router]);

  useEffect(() => {
    if (!socket) return;
    const onFound = (payload: { code: string }) => {
      setQueueing(false);
      router.push(`/lobby/${payload.code}`);
    };
    socket.on("matchmaking:found", onFound);
    return () => {
      socket.off("matchmaking:found", onFound);
    };
  }, [socket, router]);

  const createLobby = async () => {
    setError(null);
    const res = await emit<{ ok: boolean; lobby?: { code: string }; error?: string }>(
      "lobby:create",
      { maxPlayers, mode, allowSpectators: true },
    );
    if (!res.ok || !res.lobby) {
      setError(res.error ?? "Could not create lobby");
      return;
    }
    router.push(`/lobby/${res.lobby.code}`);
  };

  const joinLobby = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await emit<{ ok: boolean; lobby?: { code: string }; error?: string }>(
      "lobby:join",
      { code: code.trim().toUpperCase() },
    );
    if (!res.ok || !res.lobby) {
      setError(res.error ?? "Lobby not found");
      return;
    }
    router.push(`/lobby/${res.lobby.code}`);
  };

  const joinQueue = async () => {
    setQueueing(true);
    setError(null);
    const res = await emit<{ ok: boolean; matched?: boolean; code?: string; error?: string }>(
      "matchmaking:join",
      { size: queueSize },
    );
    if (res.matched && res.code) {
      setQueueing(false);
      router.push(`/lobby/${res.code}`);
    }
  };

  const leaveQueue = async () => {
    await emit("matchmaking:leave", { size: queueSize });
    setQueueing(false);
  };

  if (loading || !user) {
    return <div className="p-10 text-muted">Starting guest session…</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 animate-fade-up">
      <p className="text-[10px] uppercase tracking-[0.28em] text-muted">Play</p>
      <h1 className="mt-2 font-display text-4xl text-gold">Choose your table</h1>
      <p className="mt-2 text-sm text-muted">
        Socket {connected ? "connected" : "connecting…"} · 2–5 players
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <Panel className="p-6">
          <h2 className="text-lg">Create lobby</h2>
          <div className="mt-5 space-y-4">
            <div>
              <Label>Players</Label>
              <div className="flex gap-2">
                {[2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setMaxPlayers(n)}
                    className={`h-10 w-10 rounded-md border text-sm ${
                      maxPlayers === n
                        ? "border-gold text-gold"
                        : "border-border text-muted hover:border-gold/40"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Mode</Label>
              <div className="flex gap-2">
                {(["PRIVATE", "PUBLIC"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`h-10 flex-1 rounded-md border text-xs tracking-wider ${
                      mode === m
                        ? "border-gold text-gold"
                        : "border-border text-muted"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <Button className="w-full" onClick={() => void createLobby()} disabled={!connected}>
              Create
            </Button>
          </div>
        </Panel>

        <Panel className="p-6">
          <h2 className="text-lg">Join with code</h2>
          <form onSubmit={joinLobby} className="mt-5 space-y-4">
            <div>
              <Label htmlFor="code">Lobby code</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                className="tracking-[0.3em] uppercase"
              />
            </div>
            <Button type="submit" variant="secondary" className="w-full" disabled={!connected}>
              Join lobby
            </Button>
          </form>

          <div className="gold-rule my-8" />

          <h2 className="text-lg">Public matchmaking</h2>
          <div className="mt-4 flex gap-2">
            {[2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setQueueSize(n)}
                className={`h-9 w-9 rounded-md border text-sm ${
                  queueSize === n ? "border-gold text-gold" : "border-border text-muted"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          {!queueing ? (
            <Button className="mt-4 w-full" onClick={() => void joinQueue()} disabled={!connected}>
              Find match
            </Button>
          ) : (
            <Button className="mt-4 w-full" variant="danger" onClick={() => void leaveQueue()}>
              Cancel queue
            </Button>
          )}
        </Panel>
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
    </div>
  );
}
