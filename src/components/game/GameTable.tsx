"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import type {
  CardColor,
  PublicGameView,
  PublicPlayerView,
  ChatMessagePayload,
  UnoCard,
} from "@/types/game";
import { UnoCardView } from "@/components/game/UnoCard";
import { ColorChooser } from "@/components/game/ColorChooser";
import { WinnerOverlay } from "@/components/game/WinnerOverlay";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { UnoXLogo } from "@/components/brand/UnoXLogo";
import { playCardPlace } from "@/lib/audio/sfx";

function playTone(kind: "uno" | "catch") {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = "triangle";
    o.frequency.value = kind === "uno" ? 660 : 220;
    g.gain.value = 0.04;
    o.start();
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    o.stop(ctx.currentTime + 0.35);
  } catch {
    /* optional */
  }
}

const OPPONENT_SLOTS: Array<{ top: string; left: string }> = [
  { top: "10%", left: "22%" },
  { top: "6%", left: "50%" },
  { top: "10%", left: "78%" },
  { top: "40%", left: "90%" },
  { top: "40%", left: "10%" },
];

interface FlyingCard {
  id: string;
  to: "hand" | "opponent";
  seatIndex: number;
  delay: number;
}

interface Props {
  game: PublicGameView;
  chat?: ChatMessagePayload[];
  isHost: boolean;
  lobbyCode?: string | null;
  onPlay: (cardId: string, color?: CardColor) => void;
  onDraw: () => void;
  onChooseColor: (c: Exclude<CardColor, "wild">) => void;
  onUno: () => void;
  onCatch: (targetId: string) => void;
  onChat?: (content: string, isEmoji?: boolean) => void;
  onRematch: () => void;
  onLeave: () => void;
  onCashout?: () => void;
}

export function GameTable({
  game,
  isHost,
  lobbyCode,
  onPlay,
  onDraw,
  onChooseColor,
  onUno,
  onCatch,
  onRematch,
  onLeave,
  onCashout,
}: Props) {
  const [notice, setNotice] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropHot, setDropHot] = useState(false);
  const [dealing, setDealing] = useState(false);
  const [flyers, setFlyers] = useState<FlyingCard[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [throwCard, setThrowCard] = useState<UnoCard | null>(null);
  const prevAction = useRef(game.lastAction);
  const dealtGame = useRef<string | null>(null);
  const discardRef = useRef<HTMLDivElement>(null);

  const me = game.players.find((p) => p.id === game.myPlayerId);
  const isMyTurn = game.currentPlayerId === game.myPlayerId && game.phase === "playing";
  const needColor =
    game.phase === "choosing_color" && game.pendingColorChooser === game.myPlayerId;
  const showUnoButton = !!me && me.handCount === 1 && !me.calledUno;

  const humansConnected = game.players.filter(
    (p) => p.connected && !p.username.startsWith("bot_"),
  ).length;
  const canCashout = humansConnected <= 1 && game.phase !== "finished";

  const maxVoluntary = game.maxVoluntaryDraws ?? 5;
  const drawsLeft = Math.max(0, maxVoluntary - (game.voluntaryDrawsThisTurn ?? 0));

  const opponents = useMemo(
    () => game.players.filter((p) => p.id !== game.myPlayerId),
    [game.players, game.myPlayerId],
  );

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

  // Slow, fully opaque deal
  useEffect(() => {
    if (dealtGame.current === game.id) return;
    if (!game.myHand.length && game.phase !== "playing") return;
    dealtGame.current = game.id;

    const STAGGER = 0.32;
    const FLIGHT = 0.9;
    const cards: FlyingCard[] = [];
    const rounds = Math.min(10, Math.max(game.myHand.length, 1));
    let n = 0;

    for (let r = 0; r < rounds; r++) {
      for (let s = 0; s < opponents.length; s++) {
        cards.push({
          id: `fly-o-${r}-${s}`,
          to: "opponent",
          seatIndex: s,
          delay: n * STAGGER,
        });
        n += 1;
      }
      cards.push({
        id: `fly-h-${r}`,
        to: "hand",
        seatIndex: 0,
        delay: n * STAGGER,
      });
      n += 1;
    }

    setDealing(true);
    setRevealedCount(0);
    setFlyers(cards);

    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const c of cards) {
      timers.push(
        setTimeout(() => playCardPlace("deal"), (c.delay + FLIGHT * 0.9) * 1000),
      );
    }
    for (let i = 0; i < rounds; i++) {
      const hand = cards.find((c) => c.id === `fly-h-${i}`);
      if (!hand) continue;
      timers.push(
        setTimeout(() => setRevealedCount((v) => Math.max(v, i + 1)), (hand.delay + FLIGHT) * 1000),
      );
    }

    const totalMs = (n - 1) * STAGGER * 1000 + FLIGHT * 1000 + 500;
    timers.push(
      setTimeout(() => {
        setDealing(false);
        setFlyers([]);
        setRevealedCount(game.myHand.length);
      }, totalMs),
    );

    return () => timers.forEach(clearTimeout);
  }, [game.id, game.myHand.length, game.phase, opponents.length]);

  useEffect(() => {
    if (!game.lastAction || game.lastAction === prevAction.current) return;
    if (game.lastAction.type === "uno_call") {
      playTone("uno");
      setNotice("UNO!");
    }
    if (game.lastAction.type === "uno_catch") {
      playTone("catch");
      setNotice(`Caught! +${game.lastAction.penalty}`);
    }
    if (game.lastAction.type === "play") {
      playCardPlace("play");
      setThrowCard(game.lastAction.card);
      setTimeout(() => setThrowCard(null), 500);
    }
    if (game.lastAction.type === "draw") {
      playCardPlace("deal");
    }
    prevAction.current = game.lastAction;
    const t = setTimeout(() => setNotice(null), 1600);
    return () => clearTimeout(t);
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
    if (!isMyTurn || !game.topCard || dealing) return new Set<string>();
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
  }, [game, isMyTurn, dealing]);

  const canDraw =
    isMyTurn &&
    !dealing &&
    (game.drawStack > 0 || (playableIds.size === 0 && drawsLeft > 0));

  const pointInDiscard = (x: number, y: number) => {
    const el = discardRef.current;
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const pad = 40;
    return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
  };

  const handleDragEnd = (cardId: string, info: PanInfo) => {
    setDraggingId(null);
    setDropHot(false);
    if (!pointInDiscard(info.point.x, info.point.y)) return;
    if (!playableIds.has(cardId)) return;
    onPlay(cardId);
  };

  const handToShow = dealing
    ? game.myHand.slice(0, revealedCount)
    : game.myHand;

  return (
    <div className="relative flex min-h-screen flex-col bg-[#050505]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.08),transparent_55%)]" />

      <div className="relative z-20 flex items-center justify-between gap-3 px-4 py-2">
        <div className="flex items-center gap-3">
          <UnoXLogo size="sm" priority />
          {dealing && (
            <span className="text-[10px] uppercase tracking-[0.2em] text-red-400">
              Dealing… {revealedCount}/{game.myHand.length || 10}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canCashout && (
            <Button size="sm" variant="secondary" onClick={() => (onCashout ?? onLeave)()}>
              Cashout
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onLeave}>
            Leave
          </Button>
        </div>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-3 pb-3">
        {/* Big table */}
        <div className="relative mx-auto w-full flex-1 min-h-[420px] max-h-[min(68vh,700px)]">
          <div className="unox-table absolute inset-[2%] overflow-hidden rounded-[50%]">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#1c1c1c_0%,#0f0f0f_55%,#070707_100%)]" />
            <div className="pointer-events-none absolute inset-[2.5%] rounded-[50%] border border-white/[0.08]" />

            <div className="absolute left-1/2 top-[44%] z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3">
              <UnoXLogo
                size="table"
                className={cn("pointer-events-none h-20 sm:h-24", dealing && "opacity-40")}
              />
              <div className="flex items-end gap-10 sm:gap-14">
                <div className="relative flex flex-col items-center gap-1">
                  <UnoCardView
                    card={{ id: "deck", color: "wild", value: "wild" }}
                    faceDown
                    size="md"
                  />
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                    Deck · {game.deckCount}
                  </span>
                </div>

                <div
                  ref={discardRef}
                  className={cn(
                    "relative flex flex-col items-center gap-1 rounded-2xl p-3 transition",
                    dropHot && "bg-red-500/20 ring-2 ring-red-400",
                  )}
                >
                  {game.topCard ? (
                    <UnoCardView card={game.topCard} size="md" />
                  ) : (
                    <div className="flex h-[7.25rem] w-[5rem] items-center justify-center rounded-[0.9rem] border border-dashed border-white/20 text-[10px] text-zinc-600">
                      Drop
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-zinc-500">
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
                  </div>
                  <AnimatePresence>
                    {throwCard && (
                      <motion.div
                        className="pointer-events-none absolute inset-0 flex items-center justify-center"
                        initial={{ y: 90, opacity: 0.3, scale: 0.85 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <UnoCardView card={throwCard} size="md" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-2xl text-white/90">{timerLeft}</span>
                <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-600">sec</span>
              </div>
            </div>

            {/* Fully opaque flying cards */}
            {flyers.map((f) => {
              const slot = OPPONENT_SLOTS[f.seatIndex % OPPONENT_SLOTS.length];
              return (
                <motion.div
                  key={f.id}
                  className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2"
                  initial={{ left: "50%", top: "48%", opacity: 1, scale: 1 }}
                  animate={{
                    left: f.to === "hand" ? "50%" : slot.left,
                    top: f.to === "hand" ? "112%" : slot.top,
                    opacity: 1,
                    scale: 0.95,
                  }}
                  transition={{ delay: f.delay, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                >
                  <UnoCardView
                    card={{ id: f.id, color: "wild", value: "wild" }}
                    faceDown
                    size="md"
                  />
                </motion.div>
              );
            })}
          </div>

          {opponents.map((p, i) => {
            const slot = OPPONENT_SLOTS[i % OPPONENT_SLOTS.length];
            return (
              <div
                key={p.id}
                className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
                style={{ top: slot.top, left: slot.left }}
              >
                <OpponentSeat player={p} active={game.currentPlayerId === p.id} />
              </div>
            );
          })}
        </div>

        {/* Controls + straight hand */}
        <div className="relative z-10 mt-2 w-full max-w-5xl self-center">
          <div className="mb-3 flex flex-col items-center gap-2">
            <p className="text-sm text-zinc-400">
              {dealing
                ? "Handing out cards…"
                : isMyTurn
                  ? "Your turn — drag a card onto the pile"
                  : "Waiting…"}
            </p>

            <Button
              size="lg"
              className="min-w-[220px] rounded-xl text-base"
              disabled={!canDraw}
              onClick={onDraw}
            >
              {game.drawStack > 0 ? `Draw +${game.drawStack}` : "Draw card"}
            </Button>

            <div className="flex flex-wrap items-center justify-center gap-2">
              {showUnoButton && (
                <Button size="lg" onClick={onUno} className="min-w-[160px] animate-pulse-gold">
                  Call Uno
                </Button>
              )}
              {catchTargets.map((t) => (
                <Button
                  key={t.id}
                  size="lg"
                  variant="danger"
                  onClick={() => onCatch(t.id)}
                  className="min-w-[200px]"
                >
                  {t.displayName} did not call Uno
                </Button>
              ))}
            </div>
          </div>

          {/* Straight big hand */}
          <div className="flex justify-center overflow-x-auto pb-4 pt-2">
            <div className="flex items-end gap-2 px-2 sm:gap-3">
              {handToShow.map((card) => {
                const playable = playableIds.has(card.id);
                const lifting = draggingId === card.id;
                return (
                  <motion.div
                    key={card.id}
                    initial={{ y: 40, opacity: 1 }}
                    animate={{ y: lifting ? -18 : playable && isMyTurn ? -8 : 0, opacity: 1 }}
                    drag={playable && isMyTurn && !dealing}
                    dragSnapToOrigin
                    dragMomentum={false}
                    onDragStart={() => setDraggingId(card.id)}
                    onDrag={(_, info) => setDropHot(pointInDiscard(info.point.x, info.point.y))}
                    onDragEnd={(_, info) => handleDragEnd(card.id, info)}
                    whileDrag={{ scale: 1.08, zIndex: 40 }}
                    className={cn(
                      playable && isMyTurn && !dealing
                        ? "cursor-grab touch-none active:cursor-grabbing"
                        : "cursor-default",
                    )}
                    style={{ touchAction: "none" }}
                  >
                    <UnoCardView
                      card={card}
                      playable={playable || !isMyTurn}
                      selected={lifting}
                      size="lg"
                      asShell
                    />
                  </motion.div>
                );
              })}
              {!handToShow.length && game.phase === "playing" && !dealing && (
                <p className="text-sm text-zinc-600">Spectating</p>
              )}
            </div>
          </div>

          {me && (
            <p className="text-center text-xs text-zinc-500">
              {me.displayName} · {me.handCount} cards
              {me.calledUno ? " · UNO" : ""}
            </p>
          )}
        </div>
      </div>

      {notice && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
          <p className="animate-uno font-display text-5xl text-red-400">{notice}</p>
        </div>
      )}

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
  const backs = Math.min(Math.max(player.handCount, 0), 10);

  return (
    <div
      className={cn(
        "flex min-w-[120px] flex-col items-center gap-1.5 rounded-2xl border px-3 py-2 backdrop-blur-md",
        active
          ? "border-red-500/60 bg-red-500/15"
          : "border-white/15 bg-black/75",
        !player.connected && "opacity-50",
      )}
    >
      <div className="relative">
        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-[#0A0A0A] text-sm text-white">
          {player.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={player.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            player.displayName.slice(0, 1)
          )}
        </div>
        <span className="absolute -bottom-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full border border-black bg-white px-1 text-xs font-bold text-black">
          {player.handCount}
        </span>
      </div>
      <p className="max-w-[110px] truncate text-center text-xs text-white">{player.displayName}</p>
      <div className="flex h-9 items-end -space-x-3">
        {Array.from({ length: backs }).map((_, i) => (
          <UnoCardView
            key={i}
            card={{ id: `${player.id}-${i}`, color: "wild", value: "wild" }}
            faceDown
            size="sm"
            className="!h-9 !w-6"
          />
        ))}
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
        {player.handCount} card{player.handCount === 1 ? "" : "s"}
      </p>
    </div>
  );
}
