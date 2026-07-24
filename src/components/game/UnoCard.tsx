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
}

export function UnoCardView({
  card,
  selected,
  playable = true,
  faceDown,
  size = "md",
  onClick,
  className,
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
          "relative rounded-lg border border-white/25 bg-[#111] shadow-lg",
          sizes[size],
          className,
        )}
      >
        <div className="absolute inset-[3px] flex items-center justify-center rounded-md border border-red-500/35 bg-gradient-to-br from-[#1a1a1a] via-[#101010] to-[#0a0a0a]">
          <span className="font-display text-[9px] font-bold tracking-tight text-white/85">
            unox
          </span>
        </div>
      </div>
    );
  }

  const isWild = card.color === "wild";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "relative rounded-lg border border-black/40 shadow-lg transition-transform duration-200",
        sizes[size],
        colorMap[card.color],
        playable && onClick && "hover:-translate-y-2 cursor-pointer",
        !playable && "opacity-45 grayscale-[0.3]",
        selected && "-translate-y-3 ring-2 ring-gold",
        className,
      )}
    >
      <div className="absolute inset-[3px] rounded-md border border-white/20 flex flex-col items-center justify-between py-1.5 px-1">
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
          <div className="grid grid-cols-2 gap-0.5 h-8 w-8 rotate-45 overflow-hidden rounded-sm opacity-90">
            <div className="bg-[var(--uno-red)]" />
            <div className="bg-[var(--uno-yellow)]" />
            <div className="bg-[var(--uno-green)]" />
            <div className="bg-[var(--uno-blue)]" />
          </div>
        </div>
      )}
    </button>
  );
}
