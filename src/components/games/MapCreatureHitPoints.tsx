"use client";

import { Skull } from "lucide-react";
import { HitPointsEditor, type HitPointsEdit } from "@/components/ui/HitPointsEditor";
import { cn } from "@/lib/utils";
import { findHitPointBarTone, findHitPointChangesFromEdit, type CreatureHitPoints, type HitPointBarTone, type HitPointChange } from "@/rules/creature-hit-points";

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
  const { value } = control;
  const apply = (edit: HitPointsEdit) => findHitPointChangesFromEdit(value, edit).forEach((change) => control.onChange(change));
  return (
    <section aria-label="Хіти" className="grid gap-2 rounded-xl border border-white/10 bg-slate-900/40 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-slate-400">Хіти</span>
        {value ? null : <span className="text-sm text-slate-400">не задано — впишіть максимум</span>}
      </div>
      {value ? <HitPointBar hitPoints={value} /> : null}
      <HitPointsEditor current={value?.current ?? null} max={value?.max ?? null} temp={value ? value.temp ?? 0 : undefined} onApply={apply} />
    </section>
  );
}
