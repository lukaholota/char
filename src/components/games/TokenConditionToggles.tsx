"use client";

import { cn } from "@/lib/utils";
import { MAX_EXHAUSTION_LEVEL } from "@/rules/exhaustion";
import { EXHAUSTION_LABEL, TOKEN_CONDITION_KEYS, buildTokenConditionMarks, findTokenConditionLabel, type TokenConditionChange, type TokenConditions } from "@/rules/token-conditions";

export type ConditionsControl = { value: TokenConditions; onChange: ((change: TokenConditionChange) => void) | null };

const LEVELS = Array.from({ length: MAX_EXHAUSTION_LEVEL + 1 }, (_, level) => level);

/// Без onChange — повний список для читання; з ним — перемикачі, кожен не нижче 44px.
export function TokenConditionToggles({ control }: { control: ConditionsControl }) {
  const { value, onChange } = control;
  if (!onChange) return <ConditionList conditions={value} />;
  return (
    <section aria-label="Стани" className="grid gap-3 rounded-xl border border-white/10 bg-slate-900/40 p-3">
      <span className="text-sm text-slate-400">Стани</span>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {TOKEN_CONDITION_KEYS.map((condition) => {
          const isActive = value.conditions.includes(condition);
          return (
            <button key={condition} type="button" aria-pressed={isActive} onClick={() => onChange({ kind: "toggle", condition, isActive: !isActive })} className={toggleClass(isActive)}>
              {findTokenConditionLabel(condition)}
            </button>
          );
        })}
      </div>
      <div role="group" aria-label={EXHAUSTION_LABEL} className="grid gap-1.5">
        <span className="text-sm text-slate-400">{EXHAUSTION_LABEL}: рівень</span>
        <div className="grid grid-cols-7 gap-1.5">
          {LEVELS.map((level) => (
            <button key={level} type="button" aria-pressed={value.exhaustionLevel === level} aria-label={level ? `Рівень ${level}` : "Без виснаження"} onClick={() => onChange({ kind: "exhaustion", level })} className={toggleClass(value.exhaustionLevel === level)}>
              {level}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function ConditionList({ conditions }: { conditions: TokenConditions }) {
  const marks = buildTokenConditionMarks(conditions);
  if (!marks.length) return null;
  return (
    <section aria-label="Стани" className="grid gap-1.5">
      <span className="text-sm text-slate-400">Стани</span>
      <ul className="flex flex-wrap gap-1.5">
        {marks.map((mark) => (
          <li key={mark.key} className="rounded-full border border-amber-400/50 px-2 py-0.5 text-sm text-amber-100">{mark.label}</li>
        ))}
      </ul>
    </section>
  );
}

const toggleClass = (isActive: boolean) =>
  cn("min-h-11 rounded-xl border px-2 text-sm", isActive ? "border-amber-400/60 bg-amber-500/15 text-amber-50" : "border-white/10 text-slate-400 hover:text-slate-200");
