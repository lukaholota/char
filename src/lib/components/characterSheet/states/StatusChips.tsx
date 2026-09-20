"use client";

import { BatteryLow, Flame, Focus, Plus, Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { findStateSourceLabel, shortenSpellName } from "@/lib/logic/state-labels";
import { useSheetStatesContext } from "./SheetStatesContext";
import type { SheetStatesControl } from "./useSheetStates";

type StatusTone = "feature" | "concentration" | "buff" | "exhaustion";
/// `badge` не обрізається навіть тоді, коли чип стиснувся до іконки: рівень виснаження видно завжди.
type StatusItem = { key: string; tone: StatusTone; label: string; ariaLabel: string; badge?: string };

const MAX_VISIBLE = 3;

const TONE_CLASSES: Record<StatusTone, string> = {
  feature: "border-amber-400/40 bg-amber-500/15 text-amber-100",
  concentration: "border-violet-400/40 bg-violet-500/15 text-violet-100",
  buff: "border-sky-400/40 bg-sky-500/15 text-sky-100",
  exhaustion: "border-rose-400/40 bg-rose-500/15 text-rose-100",
};

const TONE_ICONS: Record<StatusTone, LucideIcon> = {
  feature: Flame,
  concentration: Focus,
  buff: Sparkles,
  exhaustion: BatteryLow,
};

const CHIP = "inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[11px] font-semibold leading-none transition active:scale-95";

/// Рядок станів у шапці листа: видно на кожному слайді, а місця не забирає — стоїть під
/// рівнем, у порожнечі поруч із портретом, і завжди в один рядок: довгі назви обрізаються,
/// «+» лишається поруч. Тап відкриває шторку станів.
export function StatusChips() {
  const control = useSheetStatesContext();
  if (!control) return null;

  const items = listStatusItems(control);
  const hidden = items.length - MAX_VISIBLE;
  if (items.length === 0 && control.isReadOnly) return null;

  const open = () => control.setPanelOpen(true);
  return (
    <div className="mt-1.5 flex min-w-0 flex-nowrap gap-1">
      {items.slice(0, MAX_VISIBLE).map((item) => {
        const Icon = TONE_ICONS[item.tone];
        return (
          <button key={item.key} type="button" onClick={open} aria-label={item.ariaLabel} className={cn(CHIP, "min-w-0 max-w-[8.5rem] shrink", TONE_CLASSES[item.tone])}>
            <Icon className="h-3 w-3 shrink-0" aria-hidden />
            {item.badge ? <span className="shrink-0 tabular-nums">{item.badge}</span> : <span className="truncate">{item.label}</span>}
          </button>
        );
      })}
      {hidden > 0 ? (
        <button type="button" onClick={open} aria-label={`Ще ${hidden} стани`} className={cn(CHIP, "shrink-0 border-white/15 bg-white/5 text-slate-200")}>
          +{hidden}
        </button>
      ) : null}
      {control.isReadOnly ? null : (
        <button
          type="button"
          onClick={open}
          aria-label="Стани персонажа"
          className={cn(CHIP, "shrink-0 border-dashed border-white/20 text-slate-300 hover:bg-white/5")}
        >
          <Plus className="h-3 w-3" aria-hidden />
          {items.length === 0 ? <span>Стан</span> : null}
        </button>
      )}
    </div>
  );
}

export function listStatusItems(control: SheetStatesControl): StatusItem[] {
  const { pers, concentration } = control;
  const concentrationName = concentration?.spell ? shortenSpellName(concentration.spell.name) : null;
  const buffsOnConcentration = (pers.effects ?? []).filter((row) => row.endsWithConcentration && row.spellId === concentration?.spellId);

  return [
    ...control.activeFeatures.map((feature) => ({ key: `feature:${feature.featureId}`, tone: "feature" as const, label: feature.name, ariaLabel: `${feature.name}: активна` })),
    ...(concentrationName
      ? [{ key: "concentration", tone: "concentration" as const, label: concentrationName, ariaLabel: `Концентрація: ${concentrationName}` }]
      : []),
    ...control.activeBuffKeys
      .filter((key) => !buffsOnConcentration.some((row) => row.effectKey === key))
      .map((key) => {
        const label = findStateSourceLabel(pers, key, control.catalog);
        return { key: `buff:${key}`, tone: "buff" as const, label, ariaLabel: `Діє: ${label}` };
      }),
    ...(control.exhaustionLevel > 0
      ? [{ key: "exhaustion", tone: "exhaustion" as const, label: "Виснаження", badge: String(control.exhaustionLevel), ariaLabel: `Виснаження, рівень ${control.exhaustionLevel}` }]
      : []),
  ];
}
