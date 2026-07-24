"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import type { CardColor, ChatMessagePayload, PublicGameView } from "@/types/game";
import { GameTable } from "@/components/game/GameTable";

export default function GamePage() {
  const params = useParams<{ id: string }>();
  const gameId = params.id;
  const { user, loading } = useAuth();
  const router = useRouter();
  const { socket, connected } = useSocket();
  const [game, setGame] = useState<PublicGameView | null>(null);
  const [chat, setChat] = useState<ChatMessagePayload[]>([]);
  const [lobbyCode, setLobbyCode] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!socket || !connected) return;

    const onState = (state: PublicGameView) => {
      setGame(state);
      // Ensure socket has game context — re-join via lobby if needed
    };
    const onChat = (msg: ChatMessagePayload) => setChat((c) => [...c, msg]);
    const onFinished = (payload: { lobbyCode?: string }) => {
      if (payload.lobbyCode) setLobbyCode(payload.lobbyCode);
    };

    socket.on("game:state", onState);
    socket.on("game:chat", onChat);
    socket.on("game:finished", onFinished);

    return () => {
      socket.off("game:state", onState);
      socket.off("game:chat", onChat);
      socket.off("game:finished", onFinished);
    };
  }, [socket, connected]);

  if (loading || !user) return <div className="p-10 text-muted">Loading…</div>;
  if (!game) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-muted">
        <p>Waiting for game state…</p>
        <p className="text-xs">Game {gameId}</p>
      </div>
    );
  }

  const isHost = game.hostId === user.id;

  const emit = (event: string, payload?: unknown) =>
    new Promise((resolve) => {
      socket?.emit(event, payload ?? {}, resolve);
    });

  return (
    <GameTable
      game={game}
      chat={chat}
      isHost={isHost}
      lobbyCode={lobbyCode}
      onPlay={(cardId, color) => void emit("game:play", { cardId, chosenColor: color })}
      onDraw={() => void emit("game:draw", {})}
      onChooseColor={(color: Exclude<CardColor, "wild">) =>
        void emit("game:choose_color", { color })
      }
      onUno={() => void emit("game:uno", {})}
      onCatch={(targetPlayerId) => void emit("game:catch_uno", { targetPlayerId })}
      onChat={(content, isEmoji) => void emit("game:chat", { content, isEmoji })}
      onRematch={() => {
        void emit("lobby:rematch", {}).then(() => {
          if (lobbyCode) router.push(`/lobby/${lobbyCode}`);
        });
      }}
      onLeave={() => {
        void emit("lobby:leave", {});
        router.push("/play");
      }}
    />
  );
}
