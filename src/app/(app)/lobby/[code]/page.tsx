"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import type { LobbyState, ChatMessagePayload, LobbyPlayer } from "@/types/game";
import { Button } from "@/components/ui/Button";
import { ChatPanel } from "@/components/chat/ChatPanel";
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
  const [friends, setFriends] = useState<Array<{ user: { id: string; displayName: string } }>>([]);
  const [chatOpen, setChatOpen] = useState(false);

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
    const onChat = (msg: ChatMessagePayload) =>
      setLobby((l) => (l ? { ...l, chat: [...l.chat, msg] } : l));
    const onStarted = (payload: { gameId: string }) => {
      router.push(`/game/${payload.gameId}`);
    };
    socket.on("lobby:state", onState);
    socket.on("lobby:chat", onChat);
    socket.on("game:started", onStarted);
    return () => {
      socket.off("lobby:state", onState);
      socket.off("lobby:chat", onChat);
      socket.off("game:started", onStarted);
    };
  }, [socket, router]);

  useEffect(() => {
    void fetch("/api/friends")
      .then((r) => r.json())
      .then((d) =>
        setFriends(
          (d.friends ?? []).filter(
            (f: { status: string }) => f.status === "ACCEPTED",
          ),
        ),
      )
      .catch(() => undefined);
  }, []);

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
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[18%] h-[55vmax] w-[80vmax] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.07),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(255,255,255,0.03),transparent_50%)]" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 lg:flex-row lg:items-stretch lg:gap-8 lg:py-8">
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-zinc-500">
                Private table
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void copyCode()}
                  className="group inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 transition hover:border-red-500/40 hover:bg-white/[0.05]"
                  title="Copy invite code"
                >
                  <span className="font-mono text-2xl font-semibold tracking-[0.35em] text-white sm:text-3xl">
                    {lobby.code}
                  </span>
                  <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-300 group-hover:text-white">
                    {copied ? "Copied" : "Copy"}
                  </span>
                </button>
              </div>
              <p className="mt-2 text-sm text-zinc-500">
                {lobby.players.length}/{lobby.maxPlayers} seated
                {readyCount > 0 ? ` · ${readyCount} ready` : ""}
                {lobby.spectators.length > 0
                  ? ` · ${lobby.spectators.length} watching`
                  : ""}
              </p>
            </div>

            <div className="flex items-center gap-2 lg:hidden">
              <Button size="sm" variant="secondary" onClick={() => setChatOpen(true)}>
                Chat
              </Button>
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

          {/* Waiting table */}
          <div className="relative mx-auto mt-6 w-full max-w-3xl flex-1">
            <div className="relative mx-auto aspect-[16/11] w-full min-h-[300px] max-h-[440px]">
              <div className="unox-table absolute inset-[6%] overflow-hidden rounded-[50%]">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#161616_0%,#0c0c0c_55%,#070707_100%)]" />
                <div className="pointer-events-none absolute inset-[4%] rounded-[50%] border border-white/[0.08]" />
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
                    canRemove={
                      isHost && (p.isBot || p.username.startsWith("bot_"))
                    }
                    onRemove={() =>
                      void emit("lobby:remove_bot", { botUserId: p.userId })
                    }
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

          {/* Actions */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
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
              <Button
                size="lg"
                variant="ghost"
                className="rounded-2xl"
                onClick={() => void cashout()}
              >
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

          {friends.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-600">
                Invite
              </span>
              {friends.map((f) => (
                <button
                  key={f.user.id}
                  type="button"
                  onClick={() => void emit("lobby:invite", { friendId: f.user.id })}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300 transition hover:border-red-500/40 hover:text-white"
                >
                  {f.user.displayName}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Desktop chat */}
        <aside className="hidden w-[300px] shrink-0 lg:block">
          <ChatPanel
            messages={lobby.chat}
            onSend={(content, isEmoji) => void emit("lobby:chat", { content, isEmoji })}
            className="h-full min-h-[520px] rounded-3xl border-white/10 bg-black/50"
          />
        </aside>
      </div>

      {/* Mobile chat drawer */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/70"
              aria-label="Close chat"
              onClick={() => setChatOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="absolute inset-x-0 bottom-0 h-[70vh] overflow-hidden rounded-t-3xl border border-white/10 bg-[#0a0a0a]"
            >
              <div className="flex justify-center py-3">
                <div className="h-1 w-10 rounded-full bg-white/20" />
              </div>
              <ChatPanel
                messages={lobby.chat}
                onSend={(content, isEmoji) => void emit("lobby:chat", { content, isEmoji })}
                className="h-[calc(70vh-28px)] rounded-none border-0"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
      style={style}
    >
      <div
        className={cn(
          "flex w-[108px] flex-col items-center gap-1.5 rounded-2xl border px-2.5 py-2 backdrop-blur-md transition",
          player.ready
            ? "border-emerald-500/40 bg-emerald-500/10"
            : isMe
              ? "border-red-500/35 bg-red-500/10"
              : "border-white/10 bg-black/65",
        )}
      >
        <div className="relative">
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border text-sm font-semibold text-white",
              player.ready ? "border-emerald-400/50" : "border-white/20",
              "bg-[#121212]",
            )}
          >
            {player.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={player.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initial
            )}
          </div>
          {player.ready && (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] text-black">
              ✓
            </span>
          )}
        </div>
        <p className="max-w-full truncate text-center text-xs text-white">
          {player.displayName}
        </p>
        <p className="text-[9px] uppercase tracking-wider text-zinc-500">
          {isHost ? "Host" : isBot ? "Bot" : isMe ? "You" : "Seated"}
          {!player.ready && !isBot ? " · waiting" : ""}
        </p>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-[10px] text-zinc-500 underline-offset-2 hover:text-red-400 hover:underline"
          >
            Remove
          </button>
        )}
      </div>
    </motion.div>
  );
}
