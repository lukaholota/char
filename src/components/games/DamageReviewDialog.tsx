"use client";

import { useId, useState } from "react";
import { create } from "zustand";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cancelGameRollAction, confirmRollDamageAction } from "@/lib/actions/game-sessions";
import { DEFENSE_LABELS, describeDamageType } from "@/lib/components/dice/roll-contexts";
import { addGameEvents, useGameSessionLiveStore } from "@/lib/components/game/game-session-live-store";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";
import { cn } from "@/lib/utils";
import type { DamageDefense } from "@/rules/creature-save";
import { applyDamageDefense, DAMAGE_DEFENSES, REVIEWED_DAMAGE_LIMIT, resolveReviewedDamage, type DamageReviewPart } from "@/rules/damage-review";
import type { GameRollEventView } from "@/server/db/game-roll-events";

type ReviewQueueState = { openedSeq: number | null; laterSeqs: number[] };
const useReviewQueueStore = create<ReviewQueueState>(() => ({ openedSeq: null, laterSeqs: [] }));

export function openDamageReview(seq: number) {
  useReviewQueueStore.setState((state) => ({ openedSeq: seq, laterSeqs: state.laterSeqs.filter((laterSeq) => laterSeq !== seq) }));
}

export function isDamageReviewPending(event: GameRollEventView): boolean {
  return event.seq > 0 && Boolean(event.damageReview?.isPending) && !event.isCancelled;
}

/// Шкода гравця не знімає хітів, поки майстер не перевірить її тут; «Пізніше» лишає кнопку в журналі.
export function DamageReviewDialog() {
  const event = useReviewedEvent();
  const putOff = () => {
    if (event) useReviewQueueStore.setState((state) => ({ openedSeq: null, laterSeqs: [...state.laterSeqs, event.seq] }));
  };
  return (
    <Dialog open={event !== null} onOpenChange={(isOpen) => (isOpen ? undefined : putOff())}>
      <DialogContent className="max-w-md overflow-y-auto">
        {event ? <DamageReviewForm key={event.seq} event={event} onPutOff={putOff} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function useReviewedEvent(): GameRollEventView | null {
  const isGm = useGameSessionLiveStore((state) => state.view?.myRole === "GM");
  const events = useGameSessionLiveStore((state) => state.events);
  const { openedSeq, laterSeqs } = useReviewQueueStore();
  if (!isGm) return null;
  const pending = events.filter(isDamageReviewPending);
  return pending.find((event) => event.seq === openedSeq) ?? pending.find((event) => !laterSeqs.includes(event.seq)) ?? null;
}

type Draft = { amount: string; defense: DamageDefense | null };

function DamageReviewForm({ event, onPutOff }: { event: GameRollEventView; onPutOff: () => void }) {
  const sessionId = useGameSessionLiveStore((state) => state.sessionId);
  const parts = event.damageReview?.parts ?? [];
  const [drafts, setDrafts] = useState<Draft[]>(() => parts.map((part) => ({ amount: String(part.amount), defense: part.defense })));
  const [isSending, setIsSending] = useState(false);
  const reviewed = parts.map((part, index) => ({ ...part, amount: Number(drafts[index].amount || 0), defense: drafts[index].defense }));
  const { damage } = resolveReviewedDamage(reviewed);
  const changeDraft = (index: number, change: Partial<Draft>) => setDrafts((previous) => previous.map((draft, draftIndex) => (draftIndex === index ? { ...draft, ...change } : draft)));

  const send = async (isConfirmed: boolean) => {
    if (sessionId === null) return;
    setIsSending(true);
    const result = isConfirmed ? await confirmRollDamageAction(sessionId, event.seq, reviewed.map(({ amount, defense }) => ({ amount, defense }))) : await cancelGameRollAction(sessionId, event.seq);
    setIsSending(false);
    if (!result.ok) return void toast.error(result.error);
    addGameEvents(sessionId, result.value);
    captureGameEvent(isConfirmed ? "game_damage_confirmed" : "game_roll_cancelled", {});
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-1 pr-10">
        <DialogTitle className="normal-case leading-7 tracking-normal">
          {event.persName ?? event.authorName} → {event.target?.name ?? event.heroTarget?.name ?? "ціль"}
        </DialogTitle>
        <DialogDescription className="text-slate-300">{event.label}</DialogDescription>
      </div>
      <ul className="grid gap-3">
        {reviewed.map((part, index) => (
          <DamagePartRow key={index} part={part} amountDraft={drafts[index].amount} disabled={isSending} onChange={(change) => changeDraft(index, change)} />
        ))}
      </ul>
      <div className="grid gap-2">
        <Button type="button" disabled={isSending} onClick={() => void send(true)} className="h-12 text-base">
          Нанести {damage}
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" disabled={isSending} onClick={() => void send(false)} className="h-11">
            Відхилити
          </Button>
          <Button type="button" variant="ghost" disabled={isSending} onClick={onPutOff} className="h-11">
            Пізніше
          </Button>
        </div>
      </div>
    </div>
  );
}

type DamagePartRowProps = { part: DamageReviewPart; amountDraft: string; disabled: boolean; onChange: (change: Partial<Draft>) => void };

function DamagePartRow({ part, amountDraft, disabled, onChange }: DamagePartRowProps) {
  const typeLabel = part.damageType ? describeDamageType(part.damageType) : "без типу";
  const name = part.label ? `${part.label} (${typeLabel})` : typeLabel;
  const inputId = useId();
  return (
    <li className="grid gap-2 rounded-xl border border-white/10 bg-slate-900/50 p-3">
      <div className="flex items-center gap-3">
        <label className="min-w-0 flex-1 break-words text-sm text-slate-200 first-letter:uppercase" htmlFor={inputId}>
          {name}
        </label>
        <Input
          id={inputId}
          inputMode="numeric"
          enterKeyHint="done"
          maxLength={String(REVIEWED_DAMAGE_LIMIT).length}
          value={amountDraft}
          disabled={disabled}
          onChange={(event) => onChange({ amount: event.target.value.replace(/\D/g, "") })}
          className="h-11 w-20 text-center font-mono text-lg"
        />
        <span className="w-12 text-right font-mono text-lg font-semibold tabular-nums text-slate-50" aria-label={`Після захисту ${applyDamageDefense(part.amount, part.defense)}`}>
          {applyDamageDefense(part.amount, part.defense)}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5" role="group" aria-label={`Захист від: ${name}`}>
        {DAMAGE_DEFENSES.map((defense) => (
          <Button
            key={defense}
            type="button"
            variant="outline"
            aria-pressed={part.defense === defense}
            disabled={disabled}
            onClick={() => onChange({ defense: part.defense === defense ? null : defense })}
            className={cn("h-10 px-1 text-sm capitalize", part.defense === defense && "border-amber-300/60 bg-amber-400/15 text-amber-50")}
          >
            {DEFENSE_LABELS[defense]}
          </Button>
        ))}
      </div>
    </li>
  );
}
