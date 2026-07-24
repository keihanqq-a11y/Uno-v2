"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import type { CardColor, ChatMessagePayload, PublicGameView } from "@/types/game";
import { GameTable } from "@/components/game/GameTable";
import { Button } from "@/components/ui/Button";

export default function GamePage() {
  const params = useParams<{ id: string }>();
  const gameId = params.id;
  const { user, loading } = useAuth();
  const router = useRouter();
  const { socket, connected, emit, socketError } = useSocket({ enabled: !!user });
  const [game, setGame] = useState<PublicGameView | null>(null);
  const [chat, setChat] = useState<ChatMessagePayload[]>([]);
  const [lobbyCode, setLobbyCode] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.refresh();
  }, [loading, user, router]);

  useEffect(() => {
    if (!socket || !connected || !gameId) return;

    const onState = (state: PublicGameView) => {
      setGame(state);
      setSyncError(null);
    };
    const onChat = (msg: ChatMessagePayload) => setChat((c) => [...c, msg]);
    const onFinished = (payload: { lobbyCode?: string }) => {
      if (payload.lobbyCode) setLobbyCode(payload.lobbyCode);
    };

    socket.on("game:state", onState);
    socket.on("game:chat", onChat);
    socket.on("game:finished", onFinished);

    // Always re-request state on mount (fixes race after Play vs bots)
    void emit<{ ok: boolean; game?: PublicGameView; error?: string; lobbyCode?: string }>(
      "game:sync",
      { gameId },
    )
      .then((res) => {
        if (res?.ok && res.game) {
          setGame(res.game);
          if (res.lobbyCode) setLobbyCode(res.lobbyCode);
        } else if (res && !res.ok) {
          setSyncError(res.error ?? "Could not load game");
        }
      })
      .catch((e: Error) => setSyncError(e.message));

    return () => {
      socket.off("game:state", onState);
      socket.off("game:chat", onChat);
      socket.off("game:finished", onFinished);
    };
  }, [socket, connected, gameId, emit]);

  if (loading || !user) {
    return <div className="p-10 text-muted">Starting guest session…</div>;
  }

  if (!game) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-muted">
          {connected ? "Loading game…" : "Connecting…"}
        </p>
        <p className="text-xs text-muted">Game {gameId}</p>
        {(syncError || socketError) && (
          <p className="text-sm text-danger">{syncError || socketError}</p>
        )}
        <div className="mt-4 flex gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setSyncError(null);
              void emit("game:sync", { gameId }).then((res) => {
                const data = res as {
                  ok?: boolean;
                  game?: PublicGameView;
                  error?: string;
                  lobbyCode?: string;
                };
                if (data?.ok && data.game) {
                  setGame(data.game);
                  if (data.lobbyCode) setLobbyCode(data.lobbyCode);
                } else {
                  setSyncError(data?.error ?? "Still could not load game");
                }
              });
            }}
          >
            Retry
          </Button>
          <Button variant="ghost" onClick={() => router.push("/play")}>
            Back to play
          </Button>
        </div>
      </div>
    );
  }

  const isHost = game.hostId === user.id;

  const emitAction = (event: string, payload?: unknown) =>
    emit(event, payload).catch((e: Error) => console.error(e));

  return (
    <GameTable
      game={game}
      chat={chat}
      isHost={isHost}
      lobbyCode={lobbyCode}
      onPlay={(cardId, color) => void emitAction("game:play", { cardId, chosenColor: color })}
      onDraw={() => void emitAction("game:draw", {})}
      onChooseColor={(color: Exclude<CardColor, "wild">) =>
        void emitAction("game:choose_color", { color })
      }
      onUno={() => void emitAction("game:uno", {})}
      onCatch={(targetPlayerId) => void emitAction("game:catch_uno", { targetPlayerId })}
      onChat={(content, isEmoji) => void emitAction("game:chat", { content, isEmoji })}
      onRematch={() => {
        void emitAction("lobby:rematch", {}).then(() => {
          if (lobbyCode) router.push(`/lobby/${lobbyCode}`);
        });
      }}
      onLeave={() => {
        void emitAction("lobby:leave", {});
        router.push("/play");
      }}
      onCashout={() => {
        void emitAction("lobby:leave", {});
        router.push("/play");
      }}
    />
  );
}
