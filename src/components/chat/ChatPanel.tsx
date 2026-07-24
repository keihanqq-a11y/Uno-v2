"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { ChatMessagePayload } from "@/types/game";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

const EMOJIS = ["🔥", "👏", "😂", "😎", "💀", "🎯", "👑", "⚡"];

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
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden border border-white/10 bg-black/40",
        className,
      )}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">
          Table chat
        </p>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/80" />
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto px-4 pb-3 text-sm">
        {messages.length === 0 && (
          <p className="pt-6 text-center text-xs text-zinc-600">No messages yet</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              m.isSystem
                ? "text-center text-[11px] italic text-zinc-600"
                : "rounded-2xl bg-white/[0.03] px-3 py-2",
            )}
          >
            {!m.isSystem && (
              <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-red-400/90">
                {m.username ?? "player"}
              </p>
            )}
            <span className={m.isEmoji ? "text-lg" : "text-zinc-200"}>{m.content}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="flex gap-1 px-3 pb-2">
        {EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            className="rounded-lg px-1.5 py-1 text-sm transition hover:bg-white/5"
            onClick={() => onSend(e, true)}
          >
            {e}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="flex gap-2 border-t border-white/5 p-3">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Say something…"
          className="h-10 rounded-xl border-white/10 bg-white/[0.03]"
          maxLength={500}
        />
        <Button type="submit" size="sm" className="h-10 rounded-xl px-4">
          Send
        </Button>
      </form>
    </div>
  );
}
