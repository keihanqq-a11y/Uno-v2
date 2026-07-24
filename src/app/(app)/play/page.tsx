"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Panel } from "@/components/ui/Panel";
import { openWallet } from "@/components/wallet/WalletBar";

export default function PlayPage() {
  const { user, loading, error: authError, refresh } = useAuth();
  const router = useRouter();
  const { connected, emit, socket, socketError } = useSocket();
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [mode, setMode] = useState<"PRIVATE" | "PUBLIC">("PRIVATE");
  const [code, setCode] = useState("");
  const [queueSize, setQueueSize] = useState(4);
  const [queueing, setQueueing] = useState(false);
  const [botCount, setBotCount] = useState(3);
  const [startingBots, setStartingBots] = useState(false);
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

  const playVsBots = async () => {
    setError(null);
    setStartingBots(true);
    const res = await emit<{ ok: boolean; gameId?: string; error?: string }>("play:vs_bots", {
      bots: botCount,
    });
    setStartingBots(false);
    if (!res.ok || !res.gameId) {
      setError(res.error ?? "Could not start bot match");
      return;
    }
    router.push(`/game/${res.gameId}`);
  };

  if (loading) {
    return <div className="p-10 text-muted">Starting…</div>;
  }

  if (authError || !user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-danger">{authError ?? "Could not start a guest session."}</p>
        <p className="mt-3 text-sm text-muted">
          In PowerShell, from the project folder run:
          <br />
          <code className="text-gold">npx prisma db push</code>
          <br />
          <code className="text-gold">npm run db:seed</code>
          <br />
          then <code className="text-gold">npm run dev</code> again.
        </p>
        <Button className="mt-6" onClick={() => void refresh()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 animate-fade-up">
      <p className="text-[10px] uppercase tracking-[0.28em] text-muted">Play</p>
      <h1 className="mt-2 font-display text-4xl text-gold">Choose your table</h1>
      <p className="mt-2 text-sm text-muted">
        Socket {connected ? "connected" : "connecting…"} · 2–5 players
      </p>
      {socketError && (
        <p className="mt-2 text-sm text-danger">
          {socketError} — stop the server (Ctrl+C) and run <code className="text-gold">npm run dev</code>
        </p>
      )}

      <Panel className="mt-8 border-gold/30 p-6">
        <h2 className="text-lg text-gold">Play vs bots</h2>
        <p className="mt-1 text-sm text-muted">
          Instant solo match — bots play automatically.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-xs uppercase tracking-wider text-muted">Bots</span>
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setBotCount(n)}
              className={`h-10 w-10 rounded-md border text-sm ${
                botCount === n ? "border-gold text-gold" : "border-border text-muted"
              }`}
            >
              {n}
            </button>
          ))}
          <Button
            className="ml-auto"
            onClick={() => void playVsBots()}
            disabled={!connected || startingBots}
          >
            {startingBots ? "Starting…" : "Start vs bots"}
          </Button>
        </div>
      </Panel>

      <Panel className="mt-6 overflow-hidden border-[#1aef4d]/25 bg-gradient-to-r from-[#1aef4d]/10 via-transparent to-transparent p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg text-[#1aef4d]">Tip a player</h2>
            <p className="mt-1 text-sm text-muted">
              Send chips to friends after a clutch win — opens in your wallet.
            </p>
          </div>
          <Button
            type="button"
            className="shrink-0 bg-[#1aef4d] text-black hover:brightness-110"
            onClick={() => openWallet("Tip")}
          >
            Open tip
          </Button>
        </div>
      </Panel>

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
