"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { openWallet } from "@/components/wallet/WalletBar";
import { UnoXLogo } from "@/components/brand/UnoXLogo";

export default function PlayPage() {
  const { user, loading, error: authError, refresh } = useAuth();
  const router = useRouter();
  const { connected, emit, socket, socketError } = useSocket({ enabled: !!user });
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [stakeUsd, setStakeUsd] = useState(1);
  const [mode, setMode] = useState<"PRIVATE" | "PUBLIC">("PRIVATE");
  const [code, setCode] = useState("");
  const [queueSize, setQueueSize] = useState(4);
  const [queueing, setQueueing] = useState(false);
  const [botCount, setBotCount] = useState(3);
  const [startingBots, setStartingBots] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const balance = user?.balanceUsd ?? 0;
  const canPlay = balance > 0;

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

  const requireFunds = () => {
    if (canPlay) return true;
    setError("Deposit funds to play.");
    openWallet("Deposit");
    return false;
  };

  const createLobby = async () => {
    if (!requireFunds()) return;
    setError(null);
    const res = await emit<{ ok: boolean; lobby?: { code: string }; error?: string }>(
      "lobby:create",
      { maxPlayers, mode, allowSpectators: true, stakeUsd },
    );
    if (!res.ok || !res.lobby) {
      setError(res.error ?? "Could not create lobby");
      return;
    }
    router.push(`/lobby/${res.lobby.code}`);
  };

  const joinLobby = async (e: FormEvent) => {
    e.preventDefault();
    if (!requireFunds()) return;
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
    if (!requireFunds()) return;
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
    if (!requireFunds()) return;
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
    return <div className="p-10 text-zinc-400">Starting…</div>;
  }

  if (authError || !user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-red-400">{authError ?? "Could not start a guest session."}</p>
        <p className="mt-3 text-sm text-zinc-400">
          Stop the server with Ctrl+C, then run{" "}
          <span className="font-mono text-white">npm run setup</span> and{" "}
          <span className="font-mono text-white">npm run dev</span>.
        </p>
        <Button className="mt-6" onClick={() => void refresh()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="unox-hero relative min-h-[calc(100vh-4rem)] overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-[0.12]">
        <div className="absolute left-[8%] top-[22%] h-28 w-20 rotate-[-18deg] rounded-xl border border-white/20 bg-white/5 blur-[1px]" />
        <div className="absolute right-[12%] top-[30%] h-32 w-22 rotate-[14deg] rounded-xl border border-white/15 bg-white/[0.04]" />
        <div className="absolute bottom-[28%] left-[18%] h-24 w-16 rotate-[8deg] rounded-xl border border-white/10 bg-white/[0.03]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col px-4 pb-8 pt-10 sm:pt-16">
        <motion.div
          className="flex flex-1 flex-col items-center justify-center text-center"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="mb-6 flex flex-col items-center gap-3">
            <UnoXLogo size="hero" priority className="animate-float" />
          </div>

          <h1 className="mt-1 max-w-xl font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-[3.4rem] md:leading-[1.05]">
            Own the table.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-400 sm:text-base">
            Private lobbies, live tables, and fast UnoX rounds — deposit once and run your room.
          </p>

          {!canPlay ? (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => openWallet("Deposit")}
              className="mt-6 rounded-full border border-[#ef4444]/40 bg-[#ef4444]/10 px-5 py-2.5 text-sm text-[#fca5a5] transition hover:border-[#ef4444]/60 hover:bg-[#ef4444]/16"
            >
              Balance is <span className="font-semibold text-white">$0.00</span> — deposit to play
            </motion.button>
          ) : null}

          <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              className="flex-1 rounded-2xl"
              onClick={() => void createLobby()}
              disabled={!connected}
            >
              <PlusLobbyIcon />
              {connected ? "Create Lobby" : "Connecting…"}
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="flex-1 rounded-2xl"
              onClick={() => setJoinOpen((v) => !v)}
              disabled={!connected}
            >
              Join Lobby
            </Button>
          </div>

          {joinOpen ? (
            <motion.form
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={joinLobby}
              className="mt-4 flex w-full max-w-md gap-2"
            >
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="LOBBY CODE"
                maxLength={6}
                className="tracking-[0.28em] uppercase"
              />
              <Button type="submit" disabled={!connected}>
                Join
              </Button>
            </motion.form>
          ) : null}

          {socketError ? (
            <div className="mt-5 w-full max-w-md rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-left text-sm text-red-200">
              <p className="font-semibold text-red-300">Connection issue</p>
              <p className="mt-1 text-red-200/90">{socketError}</p>
              <p className="mt-2 text-xs text-red-200/70">
                Keep PowerShell open with{" "}
                <span className="font-mono text-white">npm run dev</span>, then refresh.
              </p>
            </div>
          ) : null}
          {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-10 rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-5 sm:p-6"
        >
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">
                Table size
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[2, 3, 4, 5].map((n) => (
                  <Chip key={n} active={maxPlayers === n} onClick={() => setMaxPlayers(n)}>
                    {n} seats
                  </Chip>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                {(["PRIVATE", "PUBLIC"] as const).map((m) => (
                  <Chip key={m} active={mode === m} onClick={() => setMode(m)}>
                    {m === "PRIVATE" ? "Private" : "Public"}
                  </Chip>
                ))}
              </div>
              <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">
                Buy-in
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[1, 5, 10, 25].map((n) => (
                  <Chip key={n} active={stakeUsd === n} onClick={() => setStakeUsd(n)}>
                    ${n}
                  </Chip>
                ))}
              </div>
              <p className="mt-3 text-xs text-zinc-600">
                Bankroll <span className="text-zinc-300">${balance.toFixed(2)}</span>
                {" · "}
                {connected ? "Live" : "Connecting…"}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">
                Jump in
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-zinc-500">Bots</span>
                {[1, 2, 3, 4].map((n) => (
                  <Chip key={n} active={botCount === n} onClick={() => setBotCount(n)}>
                    {n}
                  </Chip>
                ))}
                <Button
                  size="sm"
                  className="ml-auto"
                  onClick={() => void playVsBots()}
                  disabled={!connected || startingBots}
                >
                  {startingBots ? "Starting…" : "Vs bots"}
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-zinc-500">Match</span>
                {[2, 3, 4, 5].map((n) => (
                  <Chip key={n} active={queueSize === n} onClick={() => setQueueSize(n)}>
                    {n}
                  </Chip>
                ))}
                {!queueing ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="ml-auto"
                    onClick={() => void joinQueue()}
                    disabled={!connected}
                  >
                    Find match
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="danger"
                    className="ml-auto"
                    onClick={() => void leaveQueue()}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function PlusLobbyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M12 10v4M10 12h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 rounded-full border px-3.5 text-xs font-semibold transition ${
        active
          ? "border-[#ef4444] bg-[#ef4444] text-white"
          : "border-white/12 text-zinc-400 hover:border-white/25 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
