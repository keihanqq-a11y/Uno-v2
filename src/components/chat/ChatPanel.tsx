"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { ChatMessagePayload } from "@/types/game";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

const EMOJIS = ["😀", "🔥", "👏", "😂", "😎", "💀", "🎯", "👑"];

export function ChatPanel({
  messages,
  onSend,
  className,
}: {
  messages: ChatMessagePayload[];
  onSend: (content: string, isEmoji?: boolean) => void;
  className?: string;
}) {
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  };

  return (
    <div className={cn("flex h-full flex-col border border-border bg-[#111]", className)}>
      <div className="border-b border-border px-4 py-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Chat</p>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
        {messages.map((m) => (
          <div key={m.id} className={cn(m.isSystem && "text-center text-xs text-muted italic")}>
            {!m.isSystem && (
              <span className="text-gold mr-1.5">{m.username ?? "player"}:</span>
            )}
            <span className={m.isEmoji ? "text-lg" : "text-text/90"}>{m.content}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="flex gap-1 border-t border-border px-2 py-2">
        {EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            className="rounded px-1.5 py-1 text-sm hover:bg-card"
            onClick={() => onSend(e, true)}
          >
            {e}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="flex gap-2 border-t border-border p-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message…"
          className="h-9"
          maxLength={500}
        />
        <Button type="submit" size="sm">
          Send
        </Button>
      </form>
    </div>
  );
}
