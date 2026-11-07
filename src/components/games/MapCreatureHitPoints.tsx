"use client";

import { useState } from "react";
import { Heart, Skull, Sword } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CREATURE_HIT_POINT_LIMIT, findHitPointBarTone, type CreatureHitPoints, type HitPointBarTone, type HitPointChange } from "@/rules/creature-hit-points";

export type HitPointsControl = { value: CreatureHitPoints | null; onChange: (change: HitPointChange) => void };

const BAR_TONE_CLASSES: Record<HitPointBarTone, string> = { healthy: "bg-emerald-500", hurt: "bg-amber-400", critical: "bg-rose-500" };

export function HitPointBar({ hitPoints, width }: { hitPoints: CreatureHitPoints; width?: number }) {
  return (
    <div aria-hidden className="h-1 overflow-hidden rounded-full bg-slate-800 ring-1 ring-slate-950/80" style={{ width }}>
      <div className={cn("h-full", BAR_TONE_CLASSES[findHitPointBarTone(hitPoints)])} style={{ width: `${(hitPoints.current / hitPoints.max) * 100}%` }} />
    </div>
  );
}

export function DownMark() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center text-slate-100">
      <Skull className="h-1/2 min-h-3.5 w-1/2 min-w-3.5 drop-shadow-[0_1px_2px_rgb(0_0_0/0.9)]" />
    </span>
  );
}

export function DownBadge() {
  return <span className="rounded-full border border-slate-400/50 px-2 py-0.5 text-xs text-slate-200">Повалений</span>;
}

export function MapCreatureHitPoints({ control }: { control: HitPointsControl }) {
  const [draft, setDraft] = useState("");
  const amount = Number(draft);
  const isAmountValid = Number.isInteger(amount) && amount >= 1;
  const submit = (kind: HitPointChange["kind"]) => {
    if (!isAmountValid) return;
    control.onChange({ kind, amount });
    setDraft("");
  };
  const { value } = control;
  return (
    <section aria-label="Хіти" className="grid gap-2 rounded-xl border border-white/10 bg-slate-900/40 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-slate-400">Хіти</span>
        {value ? (
          <span className="font-mono text-lg text-slate-50">
            {value.current} / {value.max}
          </span>
        ) : (
          <span className="text-sm text-slate-400">не задано</span>
        )}
      </div>
      {value ? <HitPointBar hitPoints={value} /> : null}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          inputMode="numeric"
          aria-label="Кількість хітів"
          placeholder="Скільки"
          value={draft}
          maxLength={String(CREATURE_HIT_POINT_LIMIT).length}
          onChange={(event) => setDraft(event.target.value.replace(/\D/g, ""))}
          className="h-11 w-24"
        />
        {value ? (
          <>
            <Button type="button" variant="destructive" disabled={!isAmountValid} onClick={() => submit("damage")} className="h-11 gap-2">
              <Sword className="h-4 w-4" aria-hidden />
              Шкода
            </Button>
            <Button type="button" variant="secondary" disabled={!isAmountValid} onClick={() => submit("heal")} className="h-11 gap-2">
              <Heart className="h-4 w-4" aria-hidden />
              Лікування
            </Button>
          </>
        ) : null}
        <Button type="button" variant="outline" disabled={!isAmountValid} onClick={() => submit("set_max")} className="h-11">
          Задати максимум
        </Button>
      </div>
    </section>
  );
}
