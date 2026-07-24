"use client";

import type { CardColor } from "@/types/game";
import { cn } from "@/lib/utils";

const colors: Exclude<CardColor, "wild">[] = ["red", "yellow", "green", "blue"];

const bg: Record<string, string> = {
  red: "bg-[var(--uno-red)]",
  yellow: "bg-[var(--uno-yellow)]",
  green: "bg-[var(--uno-green)]",
  blue: "bg-[var(--uno-blue)]",
};

export function ColorChooser({
  onChoose,
}: {
  onChoose: (c: Exclude<CardColor, "wild">) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-fade-up">
      <div className="rounded-xl border border-border bg-[#111] p-8 text-center shadow-2xl">
        <p className="font-display text-2xl text-gold mb-2">Choose a color</p>
        <p className="text-sm text-muted mb-6">Your wild sets the table color</p>
        <div className="flex gap-3 justify-center">
          {colors.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChoose(c)}
              className={cn(
                "h-14 w-14 rounded-full border-2 border-white/20 transition-transform hover:scale-110",
                bg[c],
              )}
              aria-label={c}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
