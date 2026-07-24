"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import type { CardColor, PublicGameView, PublicPlayerView, ChatMessagePayload, UnoCard } from "@/types/game";
import { UnoCardView } from "@/components/game/UnoCard";
import { ColorChooser } from "@/components/game/ColorChooser";
import { UnoCallButton } from "@/components/game/UnoCallButton";
import { CatchUnoBar } from "@/components/game/CatchUnoBar";
import { WinnerOverlay } from "@/components/game/WinnerOverlay";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { UnoXLogo } from "@/components/brand/UnoXLogo";

function playTone(kind: "uno" | "catch" | "play" | "deal") {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = kind === "deal" ? "square" : "triangle";
    o.frequency.value =
      kind === "uno" ? 660 : kind === "catch" ? 220 : kind === "deal" ? 380 : 440;
    g.gain.value = 0.03;
    o.start();
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    o.stop(ctx.currentTime + 0.22);
  } catch {
    /* audio optional */
  }
}

const OPPONENT_SLOTS: Array<{ top: string; left: string }> = [
  { top: "8%", left: "22%" },
  { top: "4%", left: "50%" },
  { top: "8%", left: "78%" },
  { top: "42%", left: "92%" },
  { top: "42%", left: "8%" },
];

interface FlyingCard {
  id: string;
  to: "hand" | "opponent";
  seatIndex: number;
  delay: number;
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
  const [notice, setNotice] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropHot, setDropHot] = useState(false);
  const [dealing, setDealing] = useState(false);
  const [flyers, setFlyers] = useState<FlyingCard[]>([]);
  const [handRevealed, setHandRevealed] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [throwCard, setThrowCard] = useState<UnoCard | null>(null);
  const prevAction = useRef(game.lastAction);
  const dealtGame = useRef<string | null>(null);
  const discardRef = useRef<HTMLDivElement>(null);
  const arenaRef = useRef<HTMLDivElement>(null);

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

  // Deal throw-in animation once per game
  useEffect(() => {
    if (dealtGame.current === game.id) return;
    if (!game.myHand.length && game.phase !== "playing") return;
    dealtGame.current = game.id;

    const cards: FlyingCard[] = [];
    const rounds = Math.min(10, Math.max(game.myHand.length, 1));
    let n = 0;
    for (let r = 0; r < rounds; r++) {
      for (let s = 0; s < opponents.length; s++) {
        cards.push({
          id: `fly-o-${r}-${s}`,
          to: "opponent",
          seatIndex: s,
          delay: n * 0.055,
        });
        n += 1;
      }
      cards.push({
        id: `fly-h-${r}`,
        to: "hand",
        seatIndex: 0,
        delay: n * 0.055,
      });
      n += 1;
    }

    setDealing(true);
    setHandRevealed(false);
    setFlyers(cards);
    playTone("deal");

    const totalMs = n * 55 + 700;
    const t1 = setTimeout(() => setHandRevealed(true), Math.min(totalMs - 200, totalMs * 0.75));
    const t2 = setTimeout(() => {
      setDealing(false);
      setFlyers([]);
      setHandRevealed(true);
    }, totalMs);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [game.id, game.myHand.length, game.phase, opponents.length]);

  useEffect(() => {
    if (game.lastAction && game.lastAction !== prevAction.current) {
      if (game.lastAction.type === "uno_call") {
        playTone("uno");
        setNotice("UNO!");
      }
      if (game.lastAction.type === "uno_catch") {
        playTone("catch");
        setNotice(`Caught! +${game.lastAction.penalty}`);
      }
      if (game.lastAction.type === "play") {
        playTone("play");
        setThrowCard(game.lastAction.card);
        setTimeout(() => setThrowCard(null), 420);
      }
      prevAction.current = game.lastAction;
      const t = setTimeout(() => setNotice(null), 1600);
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

  const pointInDiscard = (clientX: number, clientY: number) => {
    const el = discardRef.current;
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const pad = 36;
    return (
      clientX >= r.left - pad &&
      clientX <= r.right + pad &&
      clientY >= r.top - pad &&
      clientY <= r.bottom + pad
    );
  };

  const handleDrag = (_: unknown, info: PanInfo) => {
    const x = info.point.x;
    const y = info.point.y;
    setDropHot(pointInDiscard(x, y));
  };

  const handleDragEnd = (cardId: string, info: PanInfo) => {
    setDraggingId(null);
    const over = pointInDiscard(info.point.x, info.point.y);
    setDropHot(false);
    if (!over) return;
    if (!playableIds.has(cardId)) return;
    onPlay(cardId);
  };

  const visibleHand = handRevealed ? game.myHand : [];

  return (
    <div className="relative flex min-h-[calc(100vh-4.25rem)] flex-col bg-[#050505] lg:flex-row">
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.06),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(255,255,255,0.03),transparent_45%)]" />

        {/* Top bar */}
        <div className="relative z-20 flex items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <UnoXLogo size="sm" priority />
            <span className="hidden text-[10px] uppercase tracking-[0.22em] text-zinc-500 sm:inline">
              {game.direction === 1 ? "Clockwise" : "Counter-clockwise"}
            </span>
            {dealing && (
              <span className="animate-pulse text-[10px] uppercase tracking-[0.2em] text-red-400">
                Dealing…
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="lg:hidden"
              onClick={() => setChatOpen(true)}
            >
              Chat
            </Button>
            {canCashout && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => (onCashout ?? onLeave)()}
              >
                Cashout
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onLeave}>
              Leave
            </Button>
          </div>
        </div>

        {/* Arena */}
        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col px-2 pb-2 sm:px-4">
          <div
            ref={arenaRef}
            className="relative mx-auto aspect-[16/10] w-full min-h-[260px] max-h-[min(52vh,480px)]"
          >
            <div className="unox-table absolute inset-[3%] overflow-hidden rounded-[50%] sm:inset-[4%]">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#1a1a1a_0%,#0e0e0e_50%,#080808_100%)]" />
              <div className="pointer-events-none absolute inset-[3%] rounded-[50%] border border-white/[0.07]" />

              {/* Center pile */}
              <div className="absolute left-1/2 top-[42%] z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
                <UnoXLogo
                  size="table"
                  className={cn(
                    "pointer-events-none transition-opacity",
                    dealing ? "opacity-40" : "opacity-90",
                  )}
                />

                <div className="flex items-end gap-6 sm:gap-10">
                  <button
                    type="button"
                    disabled={!canDraw}
                    onClick={onDraw}
                    className={cn(
                      "relative flex flex-col items-center gap-1 transition",
                      canDraw && "hover:-translate-y-1 cursor-pointer",
                      !canDraw && "cursor-default opacity-70",
                    )}
                    title={canDraw ? "Draw a card" : undefined}
                  >
                    <div className="relative">
                      <div className="absolute -left-1 -top-1 rotate-[-7deg] opacity-40">
                        <UnoCardView
                          card={{ id: "deck-2", color: "wild", value: "wild" }}
                          faceDown
                          size="md"
                        />
                      </div>
                      <div className="absolute -left-0.5 -top-0.5 rotate-[-3deg] opacity-65">
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
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                      Draw · {game.deckCount}
                    </span>
                  </button>

                  <div
                    ref={discardRef}
                    className={cn(
                      "relative flex flex-col items-center gap-1 rounded-2xl p-2 transition",
                      dropHot && "bg-red-500/15 ring-2 ring-red-400/70",
                    )}
                  >
                    {game.topCard ? (
                      <UnoCardView card={game.topCard} size="md" />
                    ) : (
                      <div className="flex h-24 w-16 items-center justify-center rounded-xl border border-dashed border-white/20 text-[10px] text-zinc-600">
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
                      {game.drawStack > 0 && (
                        <span className="text-red-400">+{game.drawStack}</span>
                      )}
                    </div>
                    {isMyTurn && !dealing && (
                      <span className="absolute -bottom-5 whitespace-nowrap text-[9px] uppercase tracking-[0.18em] text-zinc-600">
                        Drag cards here
                      </span>
                    )}

                    <AnimatePresence>
                      {throwCard && (
                        <motion.div
                          className="pointer-events-none absolute inset-0 flex items-center justify-center"
                          initial={{ y: 80, scale: 0.85, opacity: 0.2, rotate: -12 }}
                          animate={{ y: 0, scale: 1, opacity: 1, rotate: 4 }}
                          exit={{ opacity: 0 }}
                          transition={{ type: "spring", stiffness: 420, damping: 24 }}
                        >
                          <UnoCardView card={throwCard} size="md" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-mono text-xl tabular-nums text-white/85">{timerLeft}</span>
                  <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-600">sec</span>
                </div>
              </div>

              {/* Flying deal cards */}
              <AnimatePresence>
                {flyers.map((f) => {
                  const slot = OPPONENT_SLOTS[f.seatIndex % OPPONENT_SLOTS.length];
                  const endLeft = f.to === "hand" ? "50%" : slot.left;
                  const endTop = f.to === "hand" ? "108%" : slot.top;
                  return (
                    <motion.div
                      key={f.id}
                      className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2"
                      initial={{
                        left: "50%",
                        top: "48%",
                        opacity: 1,
                        scale: 0.95,
                        rotate: 0,
                      }}
                      animate={{
                        left: endLeft,
                        top: endTop,
                        opacity: 0,
                        scale: 0.65,
                        rotate: f.to === "hand" ? 10 : -14,
                      }}
                      transition={{
                        delay: f.delay,
                        duration: 0.45,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      <UnoCardView
                        card={{ id: f.id, color: "wild", value: "wild" }}
                        faceDown
                        size="sm"
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
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

          {/* Hand + controls */}
          <div className="relative z-10 mt-3 w-full max-w-4xl self-center px-1">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                {me && (
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3 py-1.5",
                      isMyTurn
                        ? "border-red-500/50 bg-red-500/10"
                        : "border-white/10 bg-white/[0.03]",
                    )}
                  >
                    <span className="text-sm text-white">{me.displayName}</span>
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold text-black">
                      {me.handCount}
                    </span>
                  </div>
                )}
                <p className="text-sm text-zinc-500">
                  {dealing ? (
                    <span className="text-zinc-400">Cards incoming…</span>
                  ) : isMyTurn ? (
                    <span className="text-red-400">Your turn — drag a card</span>
                  ) : (
                    "Waiting…"
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="secondary" disabled={!canDraw} onClick={onDraw}>
                  {game.drawStack > 0
                    ? `Take +${game.drawStack}`
                    : `Draw${isMyTurn ? ` (${drawsLeft})` : ""}`}
                </Button>
                {showUnoButton && (
                  <Button size="sm" onClick={onUno} className="animate-pulse-gold">
                    Call Uno
                  </Button>
                )}
              </div>
            </div>

            {/* Fan hand */}
            <div className="relative mx-auto flex h-[150px] max-w-3xl items-end justify-center overflow-visible pb-2">
              {visibleHand.map((card, i) => {
                const n = visibleHand.length;
                const mid = (n - 1) / 2;
                const offset = i - mid;
                const rotate = offset * 5.5;
                const x = offset * 34;
                const playable = playableIds.has(card.id);
                const lifting = draggingId === card.id;

                return (
                  <div
                    key={card.id}
                    className={cn(
                      "absolute bottom-0 origin-bottom",
                      playable && isMyTurn ? "z-20" : "z-10",
                      lifting && "z-40",
                    )}
                    style={{
                      transform: `translateX(${x}px) rotate(${rotate}deg)`,
                    }}
                  >
                    <motion.div
                      initial={{ y: 48, opacity: 0 }}
                      animate={{
                        y: lifting ? -20 : playable && isMyTurn ? -8 : 0,
                        opacity: 1,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 28,
                        delay: Math.min(i * 0.025, 0.35),
                      }}
                      drag={playable && isMyTurn ? true : false}
                      dragSnapToOrigin
                      dragMomentum={false}
                      dragElastic={0.15}
                      onDragStart={() => setDraggingId(card.id)}
                      onDrag={handleDrag}
                      onDragEnd={(_, info) => handleDragEnd(card.id, info)}
                      whileDrag={{ scale: 1.12, rotate: -rotate, zIndex: 50 }}
                      className={cn(
                        playable && isMyTurn
                          ? "cursor-grab touch-none active:cursor-grabbing"
                          : "cursor-default",
                      )}
                      style={{ touchAction: "none" }}
                    >
                      <UnoCardView
                        card={card}
                        playable={playable}
                        selected={lifting}
                        asShell
                        className={cn(
                          playable &&
                            isMyTurn &&
                            "shadow-[0_12px_28px_rgba(239,68,68,0.25)]",
                        )}
                      />
                    </motion.div>
                  </div>
                );
              })}
              {!visibleHand.length && !dealing && game.phase === "playing" && (
                <p className="text-sm text-zinc-600">Spectating</p>
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

      <aside className="hidden border-l border-white/10 lg:block lg:w-80">
        <ChatPanel messages={chat} onSend={onChat} className="h-full rounded-none border-0" />
      </aside>

      <AnimatePresence>
        {chatOpen && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
              className="absolute inset-x-0 bottom-0 h-[65vh] overflow-hidden rounded-t-3xl border border-white/10 bg-[#0a0a0a]"
            >
              <ChatPanel
                messages={chat}
                onSend={onChat}
                className="h-full rounded-none border-0"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
        "flex min-w-[100px] flex-col items-center gap-1 rounded-2xl border px-2.5 py-2 backdrop-blur-md transition",
        active
          ? "border-red-500/60 bg-red-500/15 shadow-[0_0_28px_rgba(239,68,68,0.22)]"
          : "border-white/10 bg-black/70",
        !player.connected && "opacity-45",
      )}
    >
      <div className="relative">
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-[#0A0A0A] text-sm text-white">
          {player.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={player.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            player.displayName.slice(0, 1)
          )}
        </div>
        <span className="absolute -bottom-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-black bg-white px-1 text-[10px] font-bold text-black">
          {player.handCount}
        </span>
      </div>
      <p className="max-w-[96px] truncate text-center text-[11px] text-white">
        {player.displayName}
      </p>
      <div className="flex h-7 items-end -space-x-2.5">
        {Array.from({ length: backs }).map((_, i) => (
          <UnoCardView
            key={i}
            card={{ id: `${player.id}-${i}`, color: "wild", value: "wild" }}
            faceDown
            size="sm"
            className="!h-7 !w-[18px]"
          />
        ))}
      </div>
    </div>
  );
}
