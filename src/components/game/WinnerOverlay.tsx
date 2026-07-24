"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function WinnerOverlay({
  winnerName,
  isHost,
  lobbyCode,
  onRematch,
  onLeave,
}: {
  winnerName: string;
  isHost: boolean;
  lobbyCode?: string | null;
  onRematch: () => void;
  onLeave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-fade-up">
      <div className="mx-4 w-full max-w-md rounded-xl border border-gold/40 bg-[#111] p-10 text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted mb-3">Match complete</p>
        <h2 className="font-display text-4xl text-gold mb-2">{winnerName}</h2>
        <p className="text-muted mb-8">takes the table</p>
        <div className="gold-rule mb-8" />
        <div className="flex flex-col gap-3">
          {isHost && (
            <Button onClick={onRematch}>Rematch</Button>
          )}
          {lobbyCode && (
            <Link href={`/lobby/${lobbyCode}`}>
              <Button variant="secondary" className="w-full">
                Back to lobby
              </Button>
            </Link>
          )}
          <Button variant="ghost" onClick={onLeave}>
            Leave
          </Button>
        </div>
      </div>
    </div>
  );
}
