"use client";

import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const TABLE_SEAT_SLOTS: Array<{ top: string; left: string }> = [
  { top: "10%", left: "50%" },
  { top: "28%", left: "88%" },
  { top: "70%", left: "82%" },
  { top: "70%", left: "18%" },
  { top: "28%", left: "12%" },
];

export function seatSlot(index: number, max = 5) {
  return TABLE_SEAT_SLOTS[index % Math.min(max, TABLE_SEAT_SLOTS.length)];
}

interface Bubble {
  id: string;
  content: string;
}

interface OccupiedSeatProps {
  displayName: string;
  avatarUrl?: string | null;
  buyInUsd: number;
  active?: boolean;
  ready?: boolean;
  isMe?: boolean;
  isHost?: boolean;
  connected?: boolean;
  handCount?: number;
  showCards?: boolean;
  bubble?: Bubble | null;
  badge?: string | null;
  onRemove?: () => void;
  className?: string;
}

/** Stake-style vertical stack: big PFP → name plate → $ buy-in. */
export function OccupiedSeat({
  displayName,
  avatarUrl,
  buyInUsd,
  active,
  ready,
  isMe,
  isHost,
  connected = true,
  handCount,
  showCards,
  bubble,
  badge,
  onRemove,
  className,
}: OccupiedSeatProps) {
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <div
      className={cn(
        "relative flex w-[108px] flex-col items-center",
        !connected && "opacity-45",
        className,
      )}
    >
      <AnimatePresence>
        {bubble && (
          <motion.div
            key={bubble.id}
            initial={{ opacity: 0, y: 8, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute bottom-[calc(100%+6px)] left-1/2 z-30 max-w-[160px] -translate-x-1/2"
          >
            <div className="rounded-2xl rounded-bl-md border border-white/15 bg-[#1a1a1a] px-3 py-1.5 text-center text-[11px] leading-snug text-white shadow-xl">
              {bubble.content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <div
          className={cn(
            "flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full border-2 bg-[#141414] text-xl font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.55)]",
            active
              ? "border-red-500 ring-2 ring-red-500/40"
              : ready
                ? "border-emerald-400/70"
                : isMe
                  ? "border-white/50"
                  : "border-white/20",
          )}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initial
          )}
        </div>
        {badge && (
          <span className="absolute -top-1 left-1/2 -translate-x-1/2 rounded bg-orange-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-black">
            {badge}
          </span>
        )}
        {typeof handCount === "number" && (
          <span className="absolute -bottom-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full border border-black bg-white px-1 text-xs font-bold text-black">
            {handCount}
          </span>
        )}
      </div>

      <div className="mt-2 w-full rounded-md bg-[#1c1c1c] px-2 py-1 text-center">
        <p className="truncate text-[11px] font-medium text-white">{displayName}</p>
      </div>
      <div className="mt-1 w-full rounded-md bg-[#1c1c1c] px-2 py-1 text-center">
        <p className="text-[12px] font-semibold tabular-nums text-emerald-400">
          $ {buyInUsd.toFixed(2)}
        </p>
      </div>

      {(isHost || ready) && (
        <p className="mt-1 text-[9px] uppercase tracking-wider text-zinc-500">
          {isHost ? "Host" : ""}
          {isHost && ready ? " · " : ""}
          {ready ? "Ready" : ""}
        </p>
      )}

      {showCards && typeof handCount === "number" && (
        <div className="mt-1.5 flex h-8 items-end -space-x-2.5">
          {Array.from({ length: Math.min(Math.max(handCount, 0), 7) }).map((_, i) => (
            <div
              key={i}
              className="h-8 w-[22px] rounded-[4px] border border-black/60 bg-gradient-to-br from-[#2a2a2a] via-[#111] to-[#050505] shadow"
            />
          ))}
        </div>
      )}

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="mt-1 text-[10px] text-zinc-500 hover:text-red-400"
        >
          Remove
        </button>
      )}
    </div>
  );
}

interface EmptySeatProps {
  onSit?: () => void;
  disabled?: boolean;
  label?: string;
}

export function EmptySeat({ onSit, disabled, label = "Sit" }: EmptySeatProps) {
  return (
    <button
      type="button"
      disabled={disabled || !onSit}
      onClick={onSit}
      className={cn(
        "flex h-[72px] w-[72px] flex-col items-center justify-center rounded-full border border-white/15 bg-[#141414]/90 text-zinc-400 shadow-inner transition",
        onSit && !disabled
          ? "hover:border-red-500/50 hover:bg-[#1a1a1a] hover:text-white"
          : "cursor-default opacity-60",
      )}
      aria-label={label}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 5v10M12 15l-4-4M12 15l4-4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5 19h14"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span className="mt-0.5 text-[9px] uppercase tracking-wider">{label}</span>
    </button>
  );
}
