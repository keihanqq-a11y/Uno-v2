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
import { UnoXLogo } from "@/components/brand/UnoXLogo";

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

/** Seat positions around the oval (percent), bottom reserved for local player. */
const OPPONENT_SLOTS: Array<{ top: string; left: string }> = [
  { top: "6%", left: "18%" },
  { top: "2%", left: "38%" },
  { top: "2%", left: "62%" },
  { top: "6%", left: "82%" },
  { top: "38%", left: "94%" },
  { top: "38%", left: "6%" },
  { top: "70%", left: "10%" },
  { top: "70%", left: "90%" },
];

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
  onCashout?: () => void;
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
  onCashout,
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

  const humansConnected = game.players.filter(
    (p) => p.connected && !p.username.startsWith("bot_"),
  ).length;
  const canCashout = humansConnected <= 1 && game.phase !== "finished";

  const maxVoluntary = game.maxVoluntaryDraws ?? 5;
  const drawsLeft = Math.max(0, maxVoluntary - (game.voluntaryDrawsThisTurn ?? 0));

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

  const canDraw =
    isMyTurn &&
    (game.drawStack > 0 || (playableIds.size === 0 && drawsLeft > 0));

  const handleCardClick = (cardId: string) => {
    if (!isMyTurn) return;
    const card = game.myHand.find((c) => c.id === cardId);
    if (!card || !playableIds.has(cardId)) return;

    setSelected(cardId);
    onPlay(cardId);
  };

  const opponents = game.players.filter((p) => p.id !== game.myPlayerId);

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] flex-col lg:flex-row">
      <div className="relative flex flex-1 flex-col overflow-hidden bg-[#070707]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(40,40,40,0.35),transparent_65%)]" />

        {/* Top bar */}
        <div className="relative z-20 flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <UnoXLogo size="sm" priority />
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted">
              {game.direction === 1 ? "Clockwise" : "Counter-clockwise"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {canCashout && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => (onCashout ?? onLeave)()}
                className="border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                Cashout
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onLeave}>
              Leave
            </Button>
          </div>
        </div>

        {/* Oval table arena */}
        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 pb-2 pt-1">
          <div className="relative mx-auto aspect-[16/10] w-full max-h-[min(58vh,520px)] min-h-[280px]">
            {/* Felt */}
            <div className="unox-table absolute inset-[4%] overflow-hidden rounded-[50%]">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#1a1a1a_0%,#0d0d0d_55%,#080808_100%)]" />
              <div className="pointer-events-none absolute inset-[3%] rounded-[50%] border border-white/10" />
              <div className="pointer-events-none absolute inset-0 rounded-[50%] shadow-[inset_0_0_60px_rgba(0,0,0,0.85)]" />

              {/* Center: logo + deck + discard */}
              <div className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-[58%] flex-col items-center gap-2 sm:gap-3">
                <UnoXLogo size="table" className="animate-float pointer-events-none" />

                <div className="flex items-end gap-5 sm:gap-8">
                  {/* Deck */}
                  <div className="relative flex flex-col items-center gap-1.5">
                    <div className="relative">
                      <div className="absolute -left-1 -top-1 rotate-[-6deg] opacity-50">
                        <UnoCardView
                          card={{ id: "deck-2", color: "wild", value: "wild" }}
                          faceDown
                          size="md"
                        />
                      </div>
                      <div className="absolute -left-0.5 -top-0.5 rotate-[-3deg] opacity-70">
                        <UnoCardView
                          card={{ id: "deck-1", color: "wild", value: "wild" }}
                          faceDown
                          size="md"
                        />
                      </div>
                      <UnoCardView
                        card={{ id: "deck", color: "wild", value: "wild" }}
                        faceDown
                        size="md"
                        className="relative"
                      />
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-white/50">
                      Deck · {game.deckCount}
                    </span>
                  </div>

                  {/* Discard */}
                  <div className="flex flex-col items-center gap-1.5">
                    {game.topCard ? (
                      <UnoCardView card={game.topCard} size="md" className="animate-card-in" />
                    ) : (
                      <div className="h-24 w-16 rounded-lg border border-dashed border-white/20" />
                    )}
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/50">
                      <span
                        className={cn(
                          "inline-block h-2.5 w-2.5 rounded-full",
                          game.currentColor === "red" && "bg-[var(--uno-red)]",
                          game.currentColor === "yellow" && "bg-[var(--uno-yellow)]",
                          game.currentColor === "green" && "bg-[var(--uno-green)]",
                          game.currentColor === "blue" && "bg-[var(--uno-blue)]",
                        )}
                      />
                      {game.currentColor}
                      {game.drawStack > 0 && (
                        <span className="text-danger">+{game.drawStack}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-1 flex items-center gap-3">
                  <span className="font-display text-2xl tabular-nums text-white/90">
                    {timerLeft}
                  </span>
                  <span className="text-[9px] uppercase tracking-[0.2em] text-white/40">sec</span>
                </div>
              </div>
            </div>

            {/* Opponent seats around the oval */}
            {opponents.map((p, i) => {
              const slot = OPPONENT_SLOTS[i % OPPONENT_SLOTS.length];
              return (
                <div
                  key={p.id}
                  className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
                  style={{ top: slot.top, left: slot.left }}
                >
                  <OpponentSeat
                    player={p}
                    active={game.currentPlayerId === p.id}
                  />
                </div>
              );
            })}
          </div>

          {/* Local controls + hand */}
          <div className="relative z-10 mt-2 w-full max-w-4xl self-center px-1">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                {me && (
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3 py-1.5",
                      isMyTurn
                        ? "border-red-500/60 bg-red-500/10"
                        : "border-white/10 bg-white/5",
                    )}
                  >
                    <span className="text-sm text-white">{me.displayName}</span>
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold text-black">
                      {me.handCount}
                    </span>
                    {me.calledUno && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">
                        UNO
                      </span>
                    )}
                  </div>
                )}
                <p className="text-sm text-muted">
                  {isMyTurn ? (
                    <span className="text-red-400">Your turn</span>
                  ) : (
                    "Waiting…"
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!canDraw}
                  onClick={onDraw}
                  className="min-w-[110px]"
                >
                  {game.drawStack > 0
                    ? `Draw +${game.drawStack}`
                    : `Draw Card${isMyTurn ? ` (${drawsLeft})` : ""}`}
                </Button>
                {showUnoButton && (
                  <Button size="sm" onClick={onUno} className="min-w-[110px] animate-pulse-gold">
                    Call Uno
                  </Button>
                )}
                {canCashout && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => (onCashout ?? onLeave)()}
                    className="text-white/80"
                  >
                    Cashout
                  </Button>
                )}
              </div>
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
                <p className="text-sm text-muted">Spectating</p>
              )}
            </div>
          </div>
        </div>

        {notice && (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
            <p className="animate-uno font-display text-5xl text-red-400 drop-shadow-lg">
              {notice}
            </p>
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
  const backs = Math.min(player.handCount, 10);

  return (
    <div
      className={cn(
        "flex min-w-[108px] flex-col items-center gap-1.5 rounded-xl border px-3 py-2 backdrop-blur-sm transition",
        active
          ? "border-red-500/70 bg-red-500/15 shadow-[0_0_24px_rgba(239,68,68,0.25)]"
          : "border-white/15 bg-black/70",
        !player.connected && "opacity-45",
      )}
    >
      <div className="relative">
        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-white/20 bg-[#0A0A0A] text-sm text-white">
          {player.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={player.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            player.displayName.slice(0, 1)
          )}
        </div>
        <span className="absolute -bottom-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full border border-black bg-white px-1 text-xs font-bold text-black shadow">
          {player.handCount}
        </span>
      </div>
      <p className="max-w-[100px] truncate text-center text-xs text-white">
        {player.displayName}
        {player.username.startsWith("bot_") && (
          <span className="ml-1 text-[9px] uppercase tracking-wider text-muted">bot</span>
        )}
      </p>
      <div className="flex h-8 items-end -space-x-3">
        {Array.from({ length: backs }).map((_, i) => (
          <UnoCardView
            key={i}
            card={{ id: `${player.id}-${i}`, color: "wild", value: "wild" }}
            faceDown
            size="sm"
            className="!h-8 !w-5 scale-90"
          />
        ))}
      </div>
      <p className="text-[9px] uppercase tracking-wider text-white/45">
        {player.handCount} card{player.handCount === 1 ? "" : "s"}
        {player.calledUno && <span className="text-red-400"> · UNO</span>}
        {!player.connected && <span> · Offline</span>}
      </p>
    </div>
  );
}
