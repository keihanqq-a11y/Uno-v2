"use client";

import type { UnoCard as UnoCardType, CardColor } from "@/types/game";
import { cn } from "@/lib/utils";

const colorMap: Record<CardColor, string> = {
  red: "bg-[var(--uno-red)]",
  yellow: "bg-[var(--uno-yellow)] text-[#1a1a1a]",
  green: "bg-[var(--uno-green)]",
  blue: "bg-[var(--uno-blue)]",
  wild: "bg-[#1a1a1a]",
};

function labelFor(value: string) {
  switch (value) {
    case "skip":
      return "⊘";
    case "reverse":
      return "⇄";
    case "draw2":
      return "+2";
    case "wild":
      return "W";
    case "wild4":
      return "+4";
    default:
      return value;
  }
}

interface Props {
  card: UnoCardType;
  selected?: boolean;
  playable?: boolean;
  faceDown?: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  className?: string;
  /** Render as non-button shell (for drag wrappers). */
  asShell?: boolean;
}

export function UnoCardView({
  card,
  selected,
  playable = true,
  faceDown,
  size = "md",
  onClick,
  className,
  asShell = false,
}: Props) {
  const sizes = {
    sm: "h-16 w-11 text-sm",
    md: "h-24 w-16 text-lg",
    lg: "h-32 w-22 text-2xl",
  };

  if (faceDown) {
    return (
      <div
        className={cn(
          "relative rounded-xl border border-white/20 bg-[#111] shadow-[0_8px_20px_rgba(0,0,0,0.45)]",
          sizes[size],
          className,
        )}
      >
        <div className="absolute inset-[3px] flex items-center justify-center rounded-[10px] border border-red-500/30 bg-gradient-to-br from-[#1c1c1c] via-[#121212] to-[#0a0a0a]">
          <span className="font-display text-[9px] font-bold tracking-tight text-white/85">
            unox
          </span>
        </div>
      </div>
    );
  }

  const isWild = card.color === "wild";
  const face = (
    <>
      <div className="absolute inset-[3px] flex flex-col items-center justify-between rounded-[10px] border border-white/20 px-1 py-1.5">
        <span className="self-start text-[10px] font-bold leading-none opacity-90">
          {labelFor(card.value)}
        </span>
        <span className="font-display font-semibold leading-none drop-shadow">
          {labelFor(card.value)}
        </span>
        <span className="self-end rotate-180 text-[10px] font-bold leading-none opacity-90">
          {labelFor(card.value)}
        </span>
      </div>
      {isWild && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="grid h-8 w-8 rotate-45 grid-cols-2 gap-0.5 overflow-hidden rounded-sm opacity-90">
            <div className="bg-[var(--uno-red)]" />
            <div className="bg-[var(--uno-yellow)]" />
            <div className="bg-[var(--uno-green)]" />
            <div className="bg-[var(--uno-blue)]" />
          </div>
        </div>
      )}
    </>
  );

  const classes = cn(
    "relative rounded-xl border border-black/40 shadow-[0_8px_20px_rgba(0,0,0,0.4)]",
    sizes[size],
    colorMap[card.color],
    playable ? "opacity-100" : "opacity-40 grayscale-[0.35]",
    selected && "ring-2 ring-red-400",
    className,
  );

  if (asShell || !onClick) {
    return (
      <div className={classes} aria-hidden={asShell || undefined}>
        {face}
      </div>
    );
  }

  return (
    <button type="button" onClick={onClick} className={cn(classes, "cursor-pointer")}>
      {face}
    </button>
  );
}
