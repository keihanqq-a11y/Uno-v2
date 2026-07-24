"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CardColor, PublicGameView, PublicPlayerView, ChatMessagePayload } from "@/types/game";
import { UnoCardView } from "@/components/game/UnoCard";
import { ColorChooser } from "@/components/game/ColorChooser";
import { UnoCallButton } from "@/components/game/UnoCallButton";
import { CatchUnoBar } from "@/components/game/CatchUnoBar";
import { WinnerOverlay } from "@/components/game/WinnerOverlay";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

function playTone(kind: "uno" | "catch" | "play") {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = "triangle";
    o.frequency.value = kind === "uno" ? 660 : kind === "catch" ? 220 : 440;
    g.gain.value = 0.04;
    o.start();
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    o.stop(ctx.currentTime + 0.35);
  } catch {
    /* audio optional */
  }
}

interface Props {
  game: PublicGameView;
  chat: ChatMessagePayload[];
  isHost: boolean;
  lobbyCode?: string | null;
  onPlay: (cardId: string, color?: CardColor) => void;
  onDraw: () => void;
  onChooseColor: (c: Exclude<CardColor, "wild">) => void;
  onUno: () => void;
  onCatch: (targetId: string) => void;
  onChat: (content: string, isEmoji?: boolean) => void;
  onRematch: () => void;
  onLeave: () => void;
}

export function GameTable({
  game,
  chat,
  isHost,
  lobbyCode,
  onPlay,
  onDraw,
  onChooseColor,
  onUno,
  onCatch,
  onChat,
  onRematch,
  onLeave,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const prevAction = useRef(game.lastAction);

  const me = game.players.find((p) => p.id === game.myPlayerId);
  const isMyTurn = game.currentPlayerId === game.myPlayerId && game.phase === "playing";
  const needColor =
    game.phase === "choosing_color" &&
    game.pendingColorChooser === game.myPlayerId;

  const showUnoButton = !!me && me.handCount === 1 && !me.calledUno;

  const catchTargets = useMemo(
    () =>
      game.players.filter(
        (p) =>
          p.id !== game.myPlayerId &&
          p.unoVulnerable &&
          !p.calledUno &&
          p.handCount === 1,
      ),
    [game],
  );

  useEffect(() => {
    if (game.lastAction && game.lastAction !== prevAction.current) {
      if (game.lastAction.type === "uno_call") {
        playTone("uno");
        setNotice("UNO!");
      }
      if (game.lastAction.type === "uno_catch") {
        playTone("catch");
        setNotice(`Caught! +${game.lastAction.penalty} cards`);
      }
      if (game.lastAction.type === "play") playTone("play");
      prevAction.current = game.lastAction;
      const t = setTimeout(() => setNotice(null), 1800);
      return () => clearTimeout(t);
    }
  }, [game.lastAction]);

  const [timerLeft, setTimerLeft] = useState(game.turnTimerSec);
  useEffect(() => {
    const tick = () => {
      const elapsed = (Date.now() - game.turnStartedAt) / 1000;
      setTimerLeft(Math.max(0, Math.ceil(game.turnTimerSec - elapsed)));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [game.turnStartedAt, game.turnTimerSec, game.currentPlayerId]);

  const winner = game.players.find((p) => p.id === game.winnerId);

  const playableIds = useMemo(() => {
    if (!isMyTurn || !game.topCard) return new Set<string>();
    const ids = new Set<string>();
    for (const card of game.myHand) {
      const matchColor = card.color === game.currentColor;
      const matchValue = card.value === game.topCard.value;
      const wild = card.color === "wild";
      if (game.drawStack > 0) {
        if (card.value === "draw2") ids.add(card.id);
      } else if (matchColor || matchValue || wild) {
        ids.add(card.id);
      }
    }
    return ids;
  }, [game, isMyTurn]);

  const handleCardClick = (cardId: string) => {
    if (!isMyTurn) return;
    const card = game.myHand.find((c) => c.id === cardId);
    if (!card || !playableIds.has(cardId)) return;

    if (card.color === "wild") {
      setSelected(cardId);
      onPlay(cardId);
      return;
    }
    setSelected(cardId);
    onPlay(cardId);
  };

  const opponents = game.players.filter((p) => p.id !== game.myPlayerId);

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] flex-col lg:flex-row">
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {/* Table surface */}
        <div className="relative flex flex-1 flex-col items-center justify-between px-4 py-6">
          <div className="pointer-events-none absolute inset-8 rounded-[40%] border border-gold/10 bg-[radial-gradient(ellipse_at_center,rgba(24,24,24,0.9),rgba(10,10,10,0.2))]" />

          {/* Opponents */}
          <div className="relative z-10 flex w-full flex-wrap justify-center gap-6">
            {opponents.map((p) => (
              <OpponentSeat
                key={p.id}
                player={p}
                active={game.currentPlayerId === p.id}
              />
            ))}
          </div>

          {/* Center pile */}
          <div className="relative z-10 my-8 flex items-center gap-8">
            <div className="flex flex-col items-center gap-2">
              <UnoCardView
                card={{ id: "deck", color: "wild", value: "wild" }}
                faceDown
                size="lg"
              />
              <span className="text-xs text-muted">{game.deckCount} left</span>
              <Button
                size="sm"
                variant="secondary"
                disabled={!isMyTurn}
                onClick={onDraw}
              >
                Draw
              </Button>
            </div>

            <div className="flex flex-col items-center gap-2">
              {game.topCard && (
                <UnoCardView card={game.topCard} size="lg" className="animate-card-in" />
              )}
              <div className="flex items-center gap-2 text-xs text-muted">
                <span
                  className={cn(
                    "inline-block h-3 w-3 rounded-full",
                    game.currentColor === "red" && "bg-[var(--uno-red)]",
                    game.currentColor === "yellow" && "bg-[var(--uno-yellow)]",
                    game.currentColor === "green" && "bg-[var(--uno-green)]",
                    game.currentColor === "blue" && "bg-[var(--uno-blue)]",
                  )}
                />
                <span className="uppercase tracking-wider">{game.currentColor}</span>
                <span>·</span>
                <span>{game.direction === 1 ? "CW" : "CCW"}</span>
                {game.drawStack > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-danger">+{game.drawStack}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center gap-1 min-w-[72px]">
              <span className="font-display text-3xl text-gold tabular-nums">{timerLeft}</span>
              <span className="text-[10px] uppercase tracking-widest text-muted">sec</span>
            </div>
          </div>

          {/* My hand */}
          <div className="relative z-10 w-full max-w-4xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-muted">
                {isMyTurn ? (
                  <span className="text-gold">Your turn</span>
                ) : (
                  "Waiting…"
                )}
              </p>
              {me && (
                <p className="text-xs text-muted">
                  {me.displayName} · {me.handCount} cards
                  {me.calledUno && <span className="ml-2 text-gold">UNO</span>}
                </p>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-2 pb-4">
              {game.myHand.map((card, i) => (
                <div
                  key={card.id}
                  className="animate-card-in"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <UnoCardView
                    card={card}
                    selected={selected === card.id}
                    playable={playableIds.has(card.id)}
                    onClick={() => handleCardClick(card.id)}
                  />
                </div>
              ))}
              {!game.myHand.length && game.phase === "playing" && (
                <p className="text-muted text-sm">Spectating</p>
              )}
            </div>
          </div>
        </div>

        {notice && (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
            <p className="font-display text-5xl text-gold animate-uno drop-shadow-lg">{notice}</p>
          </div>
        )}
      </div>

      <aside className="h-72 border-t border-border lg:h-auto lg:w-80 lg:border-l lg:border-t-0">
        <ChatPanel messages={chat} onSend={onChat} className="h-full rounded-none border-0" />
      </aside>

      {showUnoButton && <UnoCallButton onCall={onUno} />}
      <CatchUnoBar targets={catchTargets} onCatch={onCatch} />
      {needColor && <ColorChooser onChoose={onChooseColor} />}
      {game.phase === "finished" && winner && (
        <WinnerOverlay
          winnerName={winner.displayName}
          isHost={isHost}
          lobbyCode={lobbyCode}
          onRematch={onRematch}
          onLeave={onLeave}
        />
      )}
    </div>
  );
}

function OpponentSeat({
  player,
  active,
}: {
  player: PublicPlayerView;
  active: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-lg border px-4 py-3 min-w-[120px]",
        active ? "border-gold bg-gold/5" : "border-border bg-card/50",
        !player.connected && "opacity-50",
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border bg-[#0A0A0A] text-sm text-gold">
        {player.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={player.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          player.displayName.slice(0, 1)
        )}
      </div>
      <p className="text-sm">
        {player.displayName}
        {player.username.startsWith("bot_") && (
          <span className="ml-1 text-[10px] uppercase tracking-wider text-muted">bot</span>
        )}
      </p>
      <div className="flex items-end -space-x-2">
        {Array.from({ length: Math.min(player.handCount, 7) }).map((_, i) => (
          <UnoCardView
            key={i}
            card={{ id: `${player.id}-${i}`, color: "wild", value: "wild" }}
            faceDown
            size="sm"
          />
        ))}
      </div>
      <p className="text-[10px] uppercase tracking-wider text-muted">
        {player.handCount} cards
        {player.calledUno && <span className="text-gold"> · UNO</span>}
      </p>
    </div>
  );
}
