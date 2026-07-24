"use client";

import { Button } from "@/components/ui/Button";

export function UnoCallButton({ onCall }: { onCall: () => void }) {
  return (
    <div className="fixed bottom-28 left-1/2 z-40 -translate-x-1/2 animate-uno">
      <Button
        size="lg"
        onClick={onCall}
        className="h-16 min-w-[220px] rounded-full border border-red-400/40 bg-red-600 text-xl tracking-[0.18em] text-white shadow-[0_0_40px_rgba(239,68,68,0.35)] animate-pulse-gold hover:bg-red-500"
      >
        CALL UNO
      </Button>
    </div>
  );
}
