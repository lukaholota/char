"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { EyeOff, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { postJournalMessageAction } from "@/lib/actions/game-sessions";
import { addPendingMessage, dropPendingRoll } from "@/lib/components/game/game-session-live-store";
import { JOURNAL_MESSAGE_LENGTH, parseJournalMessage } from "@/rules/game-roll";

const COUNTER_FROM = JOURNAL_MESSAGE_LENGTH - 50;

export function JournalComposer({ sessionId, isGm }: { sessionId: number; isGm: boolean }) {
  const [text, setText] = useState("");
  const [isForGm, setIsForGm] = useState(false);
  const message = parseJournalMessage(text);

  const send = async () => {
    if (message === null) return;
    const pending = { key: crypto.randomUUID(), text: message, isForGm: isForGm && !isGm };
    addPendingMessage(sessionId, pending);
    setText("");
    const result = await postJournalMessageAction(sessionId, pending.text, pending.isForGm, pending.key).catch(() => ({ ok: false as const, error: "Немає звʼязку — повідомлення не надіслано" }));
    if (result.ok) return;
    dropPendingRoll(pending.key);
    setText((current) => current || pending.text);
    toast.error(result.error);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void send();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    void send();
  };

  return (
    <form onSubmit={onSubmit} className="flex shrink-0 items-end gap-1.5 border-t border-white/10 p-2">
      <div className="relative min-w-0 flex-1">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          maxLength={JOURNAL_MESSAGE_LENGTH}
          enterKeyHint="send"
          placeholder={isForGm && !isGm ? "Написати лише майстру…" : "Написати в журнал…"}
          aria-label="Повідомлення в журнал"
          className="block max-h-28 min-h-10 w-full resize-none rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-base text-slate-100 placeholder:text-slate-500 [field-sizing:content] focus:border-arcane-400/60 focus:outline-none"
        />
        {text.length >= COUNTER_FROM ? <span className="pointer-events-none absolute bottom-1 right-2 text-[11px] tabular-nums text-slate-500">{text.length}/{JOURNAL_MESSAGE_LENGTH}</span> : null}
      </div>
      {isGm ? null : (
        <button
          type="button"
          onClick={() => setIsForGm((value) => !value)}
          aria-pressed={isForGm}
          aria-label="Лише майстру"
          title={isForGm ? "Повідомлення побачить лише майстер" : "Надіслати лише майстру"}
          className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border", isForGm ? "border-arcane-400/60 bg-arcane-500/15 text-arcane-100" : "border-white/10 text-slate-400 hover:text-white")}
        >
          <EyeOff className="h-4 w-4" aria-hidden />
        </button>
      )}
      <button
        type="submit"
        disabled={message === null}
        aria-label="Надіслати в журнал"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-arcane-500/25 text-arcane-50 hover:bg-arcane-500/40 disabled:opacity-40"
      >
        <Send className="h-4 w-4" aria-hidden />
      </button>
    </form>
  );
}
