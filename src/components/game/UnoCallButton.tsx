"use client";

import { Button } from "@/components/ui/Button";

export function UnoCallButton({ onCall }: { onCall: () => void }) {
  return (
    <div className="fixed bottom-28 left-1/2 z-40 -translate-x-1/2 animate-uno">
      <Button
        size="lg"
        onClick={onCall}
        className="h-16 min-w-[200px] rounded-full text-xl tracking-[0.2em] animate-pulse-gold shadow-[0_0_40px_rgba(212,175,55,0.25)]"
      >
        CALL UNO
      </Button>
    </div>
  );
}
