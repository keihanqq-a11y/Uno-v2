"use client";

import type { UnoCard as UnoCardType, CardColor, CardValue } from "@/types/game";
import { cn } from "@/lib/utils";

const FACE: Record<Exclude<CardColor, "wild">, string> = {
  red: "#e53935",
  yellow: "#f9a825",
  green: "#43a047",
  blue: "#1e88e5",
};

function isDarkText(color: CardColor) {
  return color === "yellow";
}

function symbol(value: CardValue): string {
  switch (value) {
    case "skip":
      return "⊘";
    case "reverse":
      return "⇄";
    case "draw2":
      return "+2";
    case "wild":
      return "";
    case "wild4":
      return "+4";
    default:
      return value;
  }
}

function isAction(value: CardValue) {
  return value === "skip" || value === "reverse" || value === "draw2" || value === "wild" || value === "wild4";
}

interface Props {
  card: UnoCardType;
  selected?: boolean;
  playable?: boolean;
  faceDown?: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  className?: string;
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
    sm: "h-[3.25rem] w-[2.3rem] text-[10px]",
    md: "h-[7.25rem] w-[5rem] text-base",
    lg: "h-[9.5rem] w-[6.5rem] text-xl",
  };

  const corner = {
    sm: "text-[8px] leading-none",
    md: "text-[11px] leading-none",
    lg: "text-sm leading-none",
  };

  const oval = {
    sm: "h-[58%] w-[72%]",
    md: "h-[58%] w-[74%]",
    lg: "h-[60%] w-[76%]",
  };

  if (faceDown) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-[0.85rem] border border-black/50 shadow-[0_10px_24px_rgba(0,0,0,0.55)]",
          sizes[size],
          className,
        )}
        style={{
          background:
            "radial-gradient(ellipse at 35% 25%, #2a2a2a 0%, #111 45%, #070707 100%)",
        }}
      >
        <div className="absolute inset-[4px] rounded-[0.65rem] border border-red-500/45 bg-gradient-to-br from-[#1a1a1a] via-[#101010] to-[#050505]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={cn(
              "flex items-center justify-center rounded-[50%] border border-red-500/50 bg-[#0c0c0c] shadow-[inset_0_0_18px_rgba(239,68,68,0.25)]",
              oval[size],
            )}
          >
            <span
              className={cn(
                "font-display font-extrabold tracking-tight text-white",
                size === "sm" ? "text-[7px]" : size === "md" ? "text-[11px]" : "text-sm",
              )}
            >
              unox
            </span>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent" />
      </div>
    );
  }

  const faceColor = card.color === "wild" ? null : card.color;
  const bg = faceColor ? FACE[faceColor] : "#141414";
  const ink =
    !faceColor || !isDarkText(faceColor) ? "#fff" : "#1a1a1a";
  const centerInk = !faceColor
    ? "#fff"
    : isDarkText(faceColor)
      ? "#1a1a1a"
      : FACE[faceColor];
  const wild = card.color === "wild";
  const label = symbol(card.value);
  const action = isAction(card.value);

  const face = (
    <>
      {/* gloss */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[38%] rounded-t-[0.8rem] bg-gradient-to-b from-white/25 to-transparent" />

      {/* outer white rim */}
      <div className="absolute inset-[3px] rounded-[0.7rem] border border-white/25" />

      {/* corner TL */}
      <div
        className={cn(
          "absolute left-1 top-1 flex flex-col items-center font-black",
          corner[size],
        )}
        style={{ color: ink }}
      >
        {wild && card.value === "wild4" ? (
          <span>+4</span>
        ) : wild && card.value === "wild" ? (
          <WildPip mini />
        ) : (
          <span className={action && size !== "sm" ? "tracking-tight" : ""}>{label || "W"}</span>
        )}
      </div>

      {/* corner BR */}
      <div
        className={cn(
          "absolute bottom-1 right-1 flex rotate-180 flex-col items-center font-black",
          corner[size],
        )}
        style={{ color: ink }}
      >
        {wild && card.value === "wild4" ? (
          <span>+4</span>
        ) : wild && card.value === "wild" ? (
          <WildPip mini />
        ) : (
          <span>{label || "W"}</span>
        )}
      </div>

      {/* center oval */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={cn(
            "relative flex items-center justify-center rounded-[50%] bg-white shadow-[0_4px_10px_rgba(0,0,0,0.25)]",
            oval[size],
          )}
        >
          {wild ? (
            <div className="relative flex h-[78%] w-[78%] items-center justify-center">
              <div className="absolute inset-0 overflow-hidden rounded-[50%]">
                <div className="grid h-full w-full rotate-0 grid-cols-2 grid-rows-2">
                  <div className="bg-[#e53935]" />
                  <div className="bg-[#f9a825]" />
                  <div className="bg-[#43a047]" />
                  <div className="bg-[#1e88e5]" />
                </div>
              </div>
              {card.value === "wild4" && (
                <span
                  className={cn(
                    "relative z-10 font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.65)]",
                    size === "sm" ? "text-[9px]" : size === "md" ? "text-lg" : "text-2xl",
                  )}
                >
                  +4
                </span>
              )}
            </div>
          ) : (
            <span
              className={cn(
                "font-black drop-shadow-sm",
                size === "sm" ? "text-sm" : size === "md" ? "text-3xl" : "text-4xl",
                action && size !== "sm" && "tracking-tight",
              )}
              style={{ color: centerInk }}
            >
              {label}
            </span>
          )}
        </div>
      </div>
    </>
  );

  const classes = cn(
    "relative overflow-hidden rounded-[0.9rem] border border-black/40 shadow-[0_12px_28px_rgba(0,0,0,0.45)]",
    sizes[size],
    playable ? "opacity-100" : "opacity-90 brightness-90",
    !playable && "grayscale-[0.15]",
    selected && "ring-2 ring-red-400 ring-offset-1 ring-offset-black",
    className,
  );

  if (asShell || !onClick) {
    return (
      <div className={classes} style={{ background: bg }} aria-hidden={asShell || undefined}>
        {face}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(classes, "cursor-pointer")}
      style={{ background: bg }}
    >
      {face}
    </button>
  );
}

function WildPip({ mini }: { mini?: boolean }) {
  return (
    <span
      className={cn(
        "grid grid-cols-2 grid-rows-2 overflow-hidden rounded-[2px]",
        mini ? "h-2.5 w-2.5" : "h-3 w-3",
      )}
    >
      <span className="bg-[#e53935]" />
      <span className="bg-[#f9a825]" />
      <span className="bg-[#43a047]" />
      <span className="bg-[#1e88e5]" />
    </span>
  );
}
