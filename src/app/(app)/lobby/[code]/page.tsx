"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import type { LobbyState, LobbyPlayer } from "@/types/game";
import { Button } from "@/components/ui/Button";
import { UnoXLogo } from "@/components/brand/UnoXLogo";
import { cn } from "@/lib/utils";

const SEAT_SLOTS: Array<{ top: string; left: string }> = [
  { top: "12%", left: "50%" },
  { top: "32%", left: "86%" },
  { top: "68%", left: "82%" },
  { top: "68%", left: "18%" },
  { top: "32%", left: "14%" },
];

export default function LobbyPage() {
  const params = useParams<{ code: string }>();
  const code = params.code?.toUpperCase();
  const { user, loading } = useAuth();
  const router = useRouter();
  const { socket, connected, emit } = useSocket({ enabled: !!user });
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.refresh();
  }, [loading, user, router]);

  useEffect(() => {
    if (!connected || !code || !user) return;
    void (async () => {
      const res = await emit<{ ok: boolean; lobby?: LobbyState; error?: string }>("lobby:join", {
        code,
      });
      if (!res.ok || !res.lobby) {
        setError(res.error ?? "Unable to join");
        return;
      }
      setLobby(res.lobby);
    })();
  }, [connected, code, user, emit]);

  useEffect(() => {
    if (!socket) return;
    const onState = (state: LobbyState) => setLobby(state);
    const onStarted = (payload: { gameId: string }) => {
      router.push(`/game/${payload.gameId}`);
    };
    socket.on("lobby:state", onState);
    socket.on("game:started", onStarted);
    return () => {
      socket.off("lobby:state", onState);
      socket.off("game:started", onStarted);
    };
  }, [socket, router]);

  if (loading || !user) {
    return <div className="p-10 text-zinc-500">Starting guest session…</div>;
  }
  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-red-400">{error}</p>
        <Button className="mt-6" onClick={() => router.push("/play")}>
          Back to play
        </Button>
      </div>
    );
  }
  if (!lobby) {
    return <div className="p-10 text-zinc-500">Joining table…</div>;
  }

  const me = lobby.players.find((p) => p.userId === user.id);
  const isHost = lobby.hostId === user.id;
  const humanPlayers = lobby.players.filter(
    (p) => !p.isBot && !p.username.startsWith("bot_"),
  );
  const aloneAtTable = humanPlayers.length <= 1 && lobby.status === "WAITING";
  const emptySeats = Math.max(0, lobby.maxPlayers - lobby.players.length);
  const readyCount = lobby.players.filter((p) => p.ready).length;

  const cashout = async () => {
    await emit("lobby:leave", {});
    router.push("/play");
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(lobby.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="lobby-stage relative min-h-[calc(100vh-4.25rem)] overflow-hidden">
      <div className="relative z-10 mx-auto flex max-w-5xl flex-col px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-zinc-500">
              Private table
            </p>
            <button
              type="button"
              onClick={() => void copyCode()}
              className="mt-2 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 transition hover:border-red-500/40"
            >
              <span className="font-mono text-2xl font-semibold tracking-[0.35em] text-white sm:text-3xl">
                {lobby.code}
              </span>
              <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-300">
                {copied ? "Copied" : "Copy"}
              </span>
            </button>
            <p className="mt-2 text-sm text-zinc-500">
              {lobby.players.length}/{lobby.maxPlayers} seated
              {readyCount > 0 ? ` · ${readyCount} ready` : ""}
            </p>
          </div>
        </div>

        {aloneAtTable && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-sm text-zinc-400"
          >
            Waiting on the table —{" "}
            <button
              type="button"
              onClick={() => void cashout()}
              className="font-medium text-red-400 underline-offset-4 hover:underline"
            >
              Cashout
            </button>{" "}
            anytime if nobody shows.
          </motion.p>
        )}

        <div className="relative mx-auto mt-6 w-full max-w-3xl">
          <div className="relative mx-auto aspect-[16/11] w-full min-h-[320px] max-h-[480px]">
            <div className="unox-table absolute inset-[6%] overflow-hidden rounded-[50%]">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#161616_0%,#0c0c0c_55%,#070707_100%)]" />
              <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3">
                <UnoXLogo size="table" className="opacity-90" />
                <p className="text-[11px] uppercase tracking-[0.3em] text-zinc-500">
                  {emptySeats > 0 ? `Open seats · ${emptySeats}` : "Table full"}
                </p>
              </div>
            </div>

            {lobby.players.map((p, i) => {
              const slot = SEAT_SLOTS[i % SEAT_SLOTS.length];
              return (
                <LobbySeat
                  key={p.userId}
                  player={p}
                  isHost={p.userId === lobby.hostId}
                  isMe={p.userId === user.id}
                  style={{ top: slot.top, left: slot.left }}
                  canRemove={isHost && (p.isBot || p.username.startsWith("bot_"))}
                  onRemove={() => void emit("lobby:remove_bot", { botUserId: p.userId })}
                />
              );
            })}

            {Array.from({ length: emptySeats }).map((_, i) => {
              const idx = lobby.players.length + i;
              const slot = SEAT_SLOTS[idx % SEAT_SLOTS.length];
              return (
                <div
                  key={`empty-${i}`}
                  className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                  style={{ top: slot.top, left: slot.left }}
                >
                  <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full border border-dashed border-white/15 bg-black/40 text-[10px] uppercase tracking-wider text-zinc-600">
                    Open
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {me && !me.isBot && (
            <Button
              size="lg"
              variant={me.ready ? "secondary" : "primary"}
              className="min-w-[140px] rounded-2xl"
              onClick={() => void emit("lobby:ready", { ready: !me.ready })}
            >
              {me.ready ? "Ready ✓" : "Ready up"}
            </Button>
          )}
          {isHost && lobby.players.length < lobby.maxPlayers && (
            <Button
              size="lg"
              variant="secondary"
              className="rounded-2xl"
              onClick={() => void emit("lobby:add_bot", {})}
            >
              Add bot
            </Button>
          )}
          {isHost && (
            <Button
              size="lg"
              className="min-w-[140px] rounded-2xl"
              onClick={() => void emit("lobby:start", {})}
              disabled={lobby.players.length < 2}
            >
              Start match
            </Button>
          )}
          {aloneAtTable ? (
            <Button size="lg" variant="ghost" className="rounded-2xl" onClick={() => void cashout()}>
              Cashout
            </Button>
          ) : (
            <Button
              size="lg"
              variant="ghost"
              className="rounded-2xl"
              onClick={async () => {
                await emit("lobby:leave", {});
                router.push("/play");
              }}
            >
              Leave
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function LobbySeat({
  player,
  isHost,
  isMe,
  style,
  canRemove,
  onRemove,
}: {
  player: LobbyPlayer;
  isHost: boolean;
  isMe: boolean;
  style: { top: string; left: string };
  canRemove: boolean;
  onRemove: () => void;
}) {
  const initial = player.displayName.slice(0, 1).toUpperCase();
  const isBot = !!(player.isBot || player.username.startsWith("bot_"));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
      style={style}
    >
      <div
        className={cn(
          "flex w-[108px] flex-col items-center gap-1.5 rounded-2xl border px-2.5 py-2 backdrop-blur-md",
          player.ready
            ? "border-emerald-500/40 bg-emerald-500/10"
            : isMe
              ? "border-red-500/35 bg-red-500/10"
              : "border-white/10 bg-black/65",
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-[#121212] text-sm font-semibold text-white">
          {player.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={player.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initial
          )}
        </div>
        <p className="max-w-full truncate text-center text-xs text-white">{player.displayName}</p>
        <p className="text-[9px] uppercase tracking-wider text-zinc-500">
          {isHost ? "Host" : isBot ? "Bot" : isMe ? "You" : "Seated"}
          {!player.ready && !isBot ? " · waiting" : ""}
        </p>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-[10px] text-zinc-500 hover:text-red-400"
          >
            Remove
          </button>
        )}
      </div>
    </motion.div>
  );
}
