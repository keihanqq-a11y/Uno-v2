"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import type { LobbyState, ChatMessagePayload } from "@/types/game";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { ChatPanel } from "@/components/chat/ChatPanel";

export default function LobbyPage() {
  const params = useParams<{ code: string }>();
  const code = params.code?.toUpperCase();
  const { user, loading } = useAuth();
  const router = useRouter();
  const { socket, connected, emit } = useSocket({ enabled: !!user });
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [friends, setFriends] = useState<Array<{ user: { id: string; displayName: string } }>>([]);

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

  if (loading || !user) return <div className="p-10 text-muted">Starting guest session…</div>;
  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-danger">{error}</p>
        <Button className="mt-6" onClick={() => router.push("/play")}>
          Back to play
        </Button>
      </div>
    );
  }
  if (!lobby) return <div className="p-10 text-muted">Joining lobby…</div>;

  const me = lobby.players.find((p) => p.userId === user.id);
  const isHost = lobby.hostId === user.id;

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[1fr_300px] animate-fade-up">
      <div>
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted">Lobby</p>
        <h1 className="mt-2 font-display text-4xl text-gold tracking-[0.2em]">{lobby.code}</h1>
        <p className="mt-2 text-sm text-muted">
          {lobby.mode} · {lobby.players.length}/{lobby.maxPlayers} players
          {lobby.spectators.length > 0 && ` · ${lobby.spectators.length} spectating`}
        </p>

        <Panel className="mt-8 p-6">
          <h2 className="text-sm uppercase tracking-[0.16em] text-muted">Seats</h2>
          <ul className="mt-4 space-y-3">
            {lobby.players.map((p) => (
              <li
                key={p.userId}
                className="flex items-center justify-between border-b border-border/60 pb-3"
              >
                <div>
                  <p className="text-sm">
                    {p.displayName}
                    {p.userId === lobby.hostId && (
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-gold">
                        Host
                      </span>
                    )}
                    {(p.isBot || p.username.startsWith("bot_")) && (
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-muted">
                        Bot
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted">@{p.username}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${p.ready ? "text-success" : "text-muted"}`}>
                    {p.ready ? "Ready" : "Not ready"}
                  </span>
                  {isHost && (p.isBot || p.username.startsWith("bot_")) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void emit("lobby:remove_bot", { botUserId: p.userId })}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap gap-3">
            {me && !(me.isBot) && (
              <Button
                variant={me.ready ? "secondary" : "primary"}
                onClick={() => void emit("lobby:ready", { ready: !me.ready })}
              >
                {me.ready ? "Unready" : "Ready"}
              </Button>
            )}
            {isHost && lobby.players.length < lobby.maxPlayers && (
              <Button
                variant="secondary"
                onClick={() => void emit("lobby:add_bot", {})}
              >
                Add bot
              </Button>
            )}
            {isHost && (
              <Button
                onClick={() => void emit("lobby:start", {})}
                disabled={lobby.players.length < 2}
              >
                Start game
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={async () => {
                await emit("lobby:leave", {});
                router.push("/play");
              }}
            >
              Leave
            </Button>
          </div>
        </Panel>

        {friends.length > 0 && (
          <Panel className="mt-4 p-6">
            <h2 className="text-sm uppercase tracking-[0.16em] text-muted">Invite friends</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {friends.map((f) => (
                <Button
                  key={f.user.id}
                  size="sm"
                  variant="secondary"
                  onClick={() => void emit("lobby:invite", { friendId: f.user.id })}
                >
                  Invite {f.user.displayName}
                </Button>
              ))}
            </div>
          </Panel>
        )}
      </div>

      <ChatPanel
        messages={lobby.chat}
        onSend={(content, isEmoji) => void emit("lobby:chat", { content, isEmoji })}
        className="min-h-[420px] rounded-lg"
      />
    </div>
  );
}
