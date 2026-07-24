"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import type { ChatMessagePayload, LobbyState, LobbyPlayer } from "@/types/game";
import { Button } from "@/components/ui/Button";
import { UnoXLogo } from "@/components/brand/UnoXLogo";
import {
  EmptySeat,
  OccupiedSeat,
  seatSlot,
} from "@/components/game/TableSeat";

export default function LobbyPage() {
  const params = useParams<{ code: string }>();
  const code = params.code?.toUpperCase();
  const { user, loading } = useAuth();
  const router = useRouter();
  const { socket, connected, emit } = useSocket({ enabled: !!user });
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sitError, setSitError] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatMessagePayload[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [bubbles, setBubbles] = useState<
    Record<string, { id: string; content: string; until: number }>
  >({});

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
      setChat(res.lobby.chat?.filter((m) => !m.isSystem).slice(-20) ?? []);
    })();
  }, [connected, code, user, emit]);

  useEffect(() => {
    if (!socket) return;
    const onState = (state: LobbyState) => setLobby(state);
    const onStarted = (payload: { gameId: string }) => {
      router.push(`/game/${payload.gameId}`);
    };
    const onChat = (msg: ChatMessagePayload) => {
      if (msg.isSystem) return;
      setChat((c) => [...c.slice(-40), msg]);
      if (msg.userId) {
        setBubbles((b) => ({
          ...b,
          [msg.userId!]: {
            id: msg.id,
            content: msg.content,
            until: Date.now() + 4500,
          },
        }));
      }
    };
    socket.on("lobby:state", onState);
    socket.on("game:started", onStarted);
    socket.on("lobby:chat", onChat);
    return () => {
      socket.off("lobby:state", onState);
      socket.off("game:started", onStarted);
      socket.off("lobby:chat", onChat);
    };
  }, [socket, router]);

  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setBubbles((b) => {
        const next = { ...b };
        let changed = false;
        for (const [k, v] of Object.entries(next)) {
          if (v.until <= now) {
            delete next[k];
            changed = true;
          }
        }
        return changed ? next : b;
      });
    }, 400);
    return () => clearInterval(id);
  }, []);

  const me = lobby && user ? lobby.players.find((p) => p.userId === user.id) : undefined;
  const isHost = !!(lobby && user && lobby.hostId === user.id);
  const seated = lobby?.players.filter((p) => p.seat != null) ?? [];
  const humanSeated = seated.filter((p) => !p.isBot && !p.username.startsWith("bot_"));
  const aloneAtTable = !!lobby && humanSeated.length <= 1 && lobby.status === "WAITING";
  const readyCount = seated.filter((p) => p.ready).length;
  const bySeat = new Map<number, LobbyPlayer>();
  if (lobby) {
    for (const p of lobby.players) {
      if (p.seat != null) bySeat.set(p.seat, p);
    }
  }

  if (loading || !user) {
    return <div className="p-10 text-zinc-500">Starting guest session…</div>;
  }
  if (error && !lobby) {
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

  const sit = async (seat: number) => {
    const res = await emit<{ ok: boolean; error?: string }>("lobby:sit", { seat });
    if (!res.ok) {
      setError(null);
      setSitError(res.error ?? "Could not sit");
      setTimeout(() => setSitError(null), 2500);
    }
  };

  const sendChat = async (e: FormEvent) => {
    e.preventDefault();
    const content = chatDraft.trim();
    if (!content) return;
    setChatDraft("");
    await emit("lobby:chat", { content });
  };

  return (
    <div className="lobby-stage relative min-h-[calc(100vh-4.25rem)] overflow-hidden">
      <div className="relative z-10 mx-auto flex max-w-5xl flex-col px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-zinc-500">
              Private table · ${lobby.stakeUsd.toFixed(2)} buy-in
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
              {seated.length}/{lobby.maxPlayers} seated
              {readyCount > 0 ? ` · ${readyCount} ready` : ""}
              {!me?.seat && me ? " · click a seat to sit" : ""}
            </p>
            {sitError && <p className="mt-1 text-sm text-red-400">{sitError}</p>}
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
          <div className="relative mx-auto aspect-[16/11] w-full min-h-[360px] max-h-[520px]">
            <div className="unox-table absolute inset-[6%] overflow-hidden rounded-[50%]">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#161616_0%,#0c0c0c_55%,#070707_100%)]" />
              <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3">
                <UnoXLogo size="table" className="opacity-90" />
                <p className="text-[11px] uppercase tracking-[0.3em] text-zinc-500">
                  Click a seat to sit
                </p>
              </div>
            </div>

            {Array.from({ length: lobby.maxPlayers }).map((_, seat) => {
              const slot = seatSlot(seat, lobby.maxPlayers);
              const player = bySeat.get(seat);
              return (
                <div
                  key={seat}
                  className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
                  style={{ top: slot.top, left: slot.left }}
                >
                  {player ? (
                    <OccupiedSeat
                      displayName={player.displayName}
                      avatarUrl={player.avatarUrl}
                      buyInUsd={player.buyInUsd || lobby.stakeUsd}
                      ready={player.ready}
                      isMe={player.userId === user.id}
                      isHost={player.userId === lobby.hostId}
                      connected={player.connected}
                      bubble={
                        bubbles[player.userId]
                          ? {
                              id: bubbles[player.userId].id,
                              content: bubbles[player.userId].content,
                            }
                          : null
                      }
                      onRemove={
                        isHost && (player.isBot || player.username.startsWith("bot_"))
                          ? () => void emit("lobby:remove_bot", { botUserId: player.userId })
                          : undefined
                      }
                    />
                  ) : (
                    <EmptySeat onSit={() => void sit(seat)} label="Sit" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <form
          onSubmit={(e) => void sendChat(e)}
          className="mx-auto mt-4 flex w-full max-w-md gap-2"
        >
          <input
            value={chatDraft}
            onChange={(e) => setChatDraft(e.target.value)}
            maxLength={200}
            placeholder="Say something…"
            className="h-10 flex-1 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-red-500/40"
          />
          <Button type="submit" size="sm" disabled={!chatDraft.trim()}>
            Send
          </Button>
        </form>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {me && !me.isBot && me.seat != null && (
            <Button
              size="lg"
              variant={me.ready ? "secondary" : "primary"}
              className="min-w-[140px] rounded-2xl"
              onClick={() => void emit("lobby:ready", { ready: !me.ready })}
            >
              {me.ready ? "Ready ✓" : "Ready up"}
            </Button>
          )}
          {isHost && seated.length < lobby.maxPlayers && (
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
              disabled={seated.length < 2}
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

        {chat.length > 0 && (
          <p className="mt-3 text-center text-[10px] text-zinc-600">
            Latest: {chat[chat.length - 1]?.username}: {chat[chat.length - 1]?.content}
          </p>
        )}
      </div>
    </div>
  );
}
