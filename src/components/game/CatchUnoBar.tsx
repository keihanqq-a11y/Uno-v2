"use client";

import type { PublicPlayerView } from "@/types/game";
import { Button } from "@/components/ui/Button";

export function CatchUnoBar({
  targets,
  onCatch,
}: {
  targets: PublicPlayerView[];
  onCatch: (playerId: string) => void;
}) {
  if (!targets.length) return null;
  return (
    <div className="fixed top-20 left-1/2 z-40 -translate-x-1/2 animate-fade-up">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-danger/40 bg-[#1a1010] px-4 py-3 shadow-xl">
        <span className="text-sm text-danger mr-2">Missed UNO</span>
        {targets.map((t) => (
          <Button
            key={t.id}
            variant="danger"
            size="sm"
            onClick={() => onCatch(t.id)}
            className="animate-shake"
          >
            Catch {t.displayName}
          </Button>
        ))}
      </div>
    </div>
  );
}
