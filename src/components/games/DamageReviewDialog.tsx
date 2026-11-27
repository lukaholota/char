"use client";

import { useState } from "react";
import { create } from "zustand";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cancelGameRollAction, confirmRollDamageAction } from "@/lib/actions/game-sessions";
import { DEFENSE_LABELS, describeDamageType } from "@/lib/components/dice/roll-contexts";
import { addGameEvents, useGameSessionLiveStore } from "@/lib/components/game/game-session-live-store";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";
import { cn } from "@/lib/utils";
import type { DamageDefense } from "@/rules/creature-save";
import { DAMAGE_TYPE_KEYS, type DamageTypeKey } from "@/rules/types";
import { applyDamageDefense, DAMAGE_DEFENSES, REVIEWED_DAMAGE_LIMIT, resolveReviewedDamage, type DamageReview, type DamageReviewPart } from "@/rules/damage-review";
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
/// Плашка не модальна: майстер грає далі, а черга йде від найстаршого кидка.
export function DamageReviewDialog() {
  const { event, queueSize } = useReviewedEvent();
  if (!event) return null;
  const putOff = () => useReviewQueueStore.setState((state) => ({ openedSeq: null, laterSeqs: [...state.laterSeqs, event.seq] }));
  return (
    <section
      role="dialog"
      aria-labelledby="damage-review-title"
      className="fixed inset-x-0 bottom-0 z-[80] max-h-[85dvh] overflow-y-auto rounded-t-3xl border border-white/10 bg-slate-950/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] shadow-2xl shadow-black/60 backdrop-blur-xl md:inset-x-auto md:bottom-4 md:left-4 md:w-[24rem] md:rounded-3xl md:pb-4"
    >
      <DamageReviewForm key={event.seq} event={event} queueSize={queueSize} onPutOff={putOff} />
    </section>
  );
}

function useReviewedEvent(): { event: GameRollEventView | null; queueSize: number } {
  const isGm = useGameSessionLiveStore((state) => state.view?.myRole === "GM");
  const events = useGameSessionLiveStore((state) => state.events);
  const { openedSeq, laterSeqs } = useReviewQueueStore();
  if (!isGm) return { event: null, queueSize: 0 };
  const pending = events.filter(isDamageReviewPending).sort((left, right) => left.seq - right.seq);
  const event = pending.find((candidate) => candidate.seq === openedSeq) ?? pending.find((candidate) => !laterSeqs.includes(candidate.seq)) ?? null;
  return { event, queueSize: pending.filter((candidate) => !laterSeqs.includes(candidate.seq) || candidate.seq === openedSeq).length };
}

type Draft = { amount: string; defense: DamageDefense | null; damageType: DamageTypeKey | null };

function DamageReviewForm({ event, queueSize, onPutOff }: { event: GameRollEventView; queueSize: number; onPutOff: () => void }) {
  const sessionId = useGameSessionLiveStore((state) => state.sessionId);
  const parts = event.damageReview?.parts ?? [];
  const [drafts, setDrafts] = useState<Draft[]>(() => parts.map((part) => ({ amount: String(part.amount), defense: part.defense, damageType: part.damageType })));
  const [isSending, setIsSending] = useState(false);
  const reviewed = parts.map((part, index) => ({ ...part, amount: Number(drafts[index].amount || 0), defense: drafts[index].defense, damageType: drafts[index].damageType }));
  const { damage } = resolveReviewedDamage(reviewed);
  const changeDraft = (index: number, change: Partial<Draft>) => setDrafts((previous) => previous.map((draft, draftIndex) => (draftIndex === index ? { ...draft, ...change } : draft)));

  const send = async (isConfirmed: boolean) => {
    if (sessionId === null) return;
    setIsSending(true);
    const choices = reviewed.map(({ amount, defense, damageType }) => ({ amount, defense, damageType }));
    const result = isConfirmed ? await confirmRollDamageAction(sessionId, event.seq, choices) : await cancelGameRollAction(sessionId, event.seq);
    setIsSending(false);
    if (!result.ok) return void toast.error(result.error);
    addGameEvents(sessionId, result.value);
    captureGameEvent(isConfirmed ? "game_damage_confirmed" : "game_roll_cancelled", {});
  };

  return (
    <div className="grid gap-3">
      <div className="grid gap-0.5">
        <h2 id="damage-review-title" className="font-rpg-display text-lg leading-7 text-slate-50">
          {event.persName ?? event.authorName} → {event.target?.name ?? event.heroTarget?.name ?? "ціль"}
        </h2>
        <p className="text-sm text-slate-300">
          {event.label}
          {queueSize > 1 ? <span className="text-slate-400"> · ще {queueSize - 1} в черзі</span> : null}
        </p>
      </div>
      <ul className="grid gap-2">
        {reviewed.map((part, index) => (
          <DamagePartRow key={index} part={part} defenses={event.damageReview?.defenses} amountDraft={drafts[index].amount} disabled={isSending} onChange={(change) => changeDraft(index, change)} />
        ))}
      </ul>
      <div className="grid gap-2">
        <Button type="button" disabled={isSending} onClick={() => void send(true)} className="h-12 text-base">
          Завдати {damage}
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

type DamagePartRowProps = { part: DamageReviewPart; defenses: DamageReview["defenses"]; amountDraft: string; disabled: boolean; onChange: (change: Partial<Draft>) => void };
const UNTYPED = "";

function DamagePartRow({ part, defenses, amountDraft, disabled, onChange }: DamagePartRowProps) {
  const name = part.label || "Шкода";
  const after = applyDamageDefense(part.amount, part.defense);
  const changeType = (value: string) => {
    const damageType = value === UNTYPED ? null : (value as DamageTypeKey);
    onChange({ damageType, defense: (damageType && defenses?.[damageType]) ?? null });
  };
  return (
    <li className="grid gap-2 rounded-xl border border-white/10 bg-slate-900/50 p-3">
      <div className="flex items-end gap-2">
        <div className="grid min-w-0 flex-1 gap-1">
          <span className="truncate text-sm text-slate-200 first-letter:uppercase">{name}</span>
          <select
            aria-label={`Тип шкоди: ${name}`}
            value={part.damageType ?? UNTYPED}
            disabled={disabled}
            onChange={(event) => changeType(event.target.value)}
            className="h-11 min-w-0 rounded-lg border border-white/15 bg-slate-950 px-2 text-base text-slate-100"
          >
            <option value={UNTYPED}>без типу</option>
            {DAMAGE_TYPE_KEYS.map((damageType) => <option key={damageType} value={damageType}>{describeDamageType(damageType)}</option>)}
          </select>
        </div>
        <div className="grid gap-1 text-center">
          <span className="text-xs text-slate-400" aria-hidden>Кинуто</span>
          <Input
            inputMode="numeric"
            enterKeyHint="done"
            maxLength={String(REVIEWED_DAMAGE_LIMIT).length}
            value={amountDraft}
            disabled={disabled}
            onChange={(event) => onChange({ amount: event.target.value.replace(/\D/g, "") })}
            aria-label={`Кинуто: ${name}`}
            className="h-11 w-16 text-center font-mono text-lg"
          />
        </div>
        <div className="grid w-16 gap-1 text-center">
          <span className="text-xs text-slate-400" aria-hidden>Завдасть</span>
          <span className="flex h-11 items-center justify-center font-mono text-lg font-semibold tabular-nums text-slate-50" aria-label={`Завдасть ${after}`}>
            {after}
          </span>
        </div>
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
