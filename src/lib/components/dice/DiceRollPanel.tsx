"use client";

import { formatModifier } from "@/lib/logic/utils";
import type { DiceRollAction, DiceRollContext } from "@/lib/stores/diceUIStore";
import type { D20Mode } from "@/rules/dice-roll";
import { cn } from "@/lib/utils";
import { describeActionDice, formatExtraDice, type DiceRollOutcome } from "./roll-contexts";
import { D20Icon } from "@/lib/components/icons/D20Icon";

type Props = {
  context: DiceRollContext;
  activeActionKey: string | null;
  isReady: boolean;
  isRolling: boolean;
  outcome: DiceRollOutcome | null;
  onRoll: (action: DiceRollAction, d20Mode: D20Mode) => void;
};

const REROLL_MODES: Array<{ mode: D20Mode; label: string }> = [
  { mode: "NORMAL", label: "Ще раз" },
  { mode: "ADVANTAGE", label: "З перевагою" },
  { mode: "DISADVANTAGE", label: "З перешкодою" },
];

const ACTION_BUTTON = "min-h-11 rounded-xl border text-sm font-semibold transition active:scale-95 disabled:opacity-50 disabled:active:scale-100";
const ACTION_IDLE = "border-white/10 bg-slate-900/60 text-slate-200 hover:bg-slate-800";
const ACTION_ACTIVE = "border-amber-400/50 bg-amber-500/20 text-amber-50";

export function DiceRollPanel({ context, activeActionKey, isReady, isRolling, outcome, onRoll }: Props) {
  const activeAction = findActiveAction(context, activeActionKey);
  const canRoll = isReady && !isRolling;
  return (
    <div className="space-y-3 px-4">
      {context.actions.length > 1 ? (
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${context.actions.length}, minmax(0, 1fr))` }}>
          {context.actions.map((action) => (
            <button
              key={action.key}
              type="button"
              disabled={!canRoll}
              aria-pressed={action.key === activeAction.key}
              onClick={() => onRoll(action, action.mode ?? "NORMAL")}
              className={cn(ACTION_BUTTON, "px-2", action.key === activeAction.key ? ACTION_ACTIVE : ACTION_IDLE)}
            >
              {action.label} <span className="font-bold text-amber-200">{describeActionBonus(action)}</span>
            </button>
          ))}
        </div>
      ) : null}

      <OutcomeCard action={activeAction} outcome={outcome} isRolling={isRolling} />
      {context.check && outcome && !isRolling ? <CheckVerdict total={outcome.total} check={context.check} /> : null}

      <div className={cn("grid gap-2", activeAction.isD20 ? "grid-cols-3" : "grid-cols-1")}>
        {(activeAction.isD20 ? REROLL_MODES : REROLL_MODES.slice(0, 1)).map(({ mode, label }) => {
          const isDefault = mode === (activeAction.isD20 ? activeAction.mode ?? "NORMAL" : "NORMAL");
          return (
            <button
              key={mode}
              type="button"
              disabled={!canRoll}
              onClick={() => onRoll(activeAction, mode)}
              className={cn(ACTION_BUTTON, "flex items-center justify-center gap-1.5 px-1", isDefault ? ACTION_ACTIVE : ACTION_IDLE)}
            >
              {isDefault ? <D20Icon className="h-4 w-4" /> : null}
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function findActiveAction(context: DiceRollContext, activeActionKey: string | null): DiceRollAction {
  const wantedKey = activeActionKey ?? context.autoRollKey;
  return context.actions.find((action) => action.key === wantedKey) ?? context.actions[0];
}

function describeActionBonus(action: DiceRollAction): string {
  return action.isD20 ? formatModifier(action.bonus) : `${describeActionDice(action)}${action.bonus ? formatModifier(action.bonus) : ""}`;
}

function OutcomeCard({ action, outcome, isRolling }: { action: DiceRollAction; outcome: DiceRollOutcome | null; isRolling: boolean }) {
  const shown = !isRolling && outcome ? outcome : null;
  const isNatural20 = shown?.d20Mode !== null && shown?.baseValue === 20;
  const isNatural1 = shown?.d20Mode !== null && shown?.baseValue === 1;
  return (
    <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-center" aria-live="polite">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-200/80">
        {action.label} · {describeActionDice(action)} {formatModifier(action.bonus)}
        {action.extraDice?.length ? ` ${formatExtraDice(action.extraDice)}` : null}
      </div>
      <StateLine action={action} />
      <div
        className={cn(
          "mt-1 text-5xl font-black leading-none tabular-nums",
          isNatural20 ? "text-emerald-300" : isNatural1 ? "text-rose-300" : "text-amber-100",
          isRolling && "animate-pulse text-amber-200/60",
        )}
      >
        {isRolling ? "…" : shown ? shown.total : "—"}
      </div>
      <div className="mt-1.5 min-h-4 text-xs font-medium text-amber-100/80">
        {isRolling ? "Кубики летять…" : shown ? describeOutcome(shown) : "Торкніться кнопки, щоб кинути"}
      </div>
    </div>
  );
}

function CheckVerdict({ total, check }: { total: number; check: NonNullable<DiceRollContext["check"]> }) {
  const isSuccess = total >= check.dc;
  return (
    <div className={cn("rounded-xl px-3 py-2 text-center text-sm font-bold", isSuccess ? "bg-emerald-500/15 text-emerald-200" : "bg-rose-500/15 text-rose-200")}>
      {isSuccess ? `Успіх: ${total} ≥ СК ${check.dc} — ${check.successText}` : `Провал: ${total} < СК ${check.dc} — ${check.failureText}`}
    </div>
  );
}

/// Чому кидок пішов із перевагою — одним рядком, щоб гравець не шукав причину.
function StateLine({ action }: { action: DiceRollAction }) {
  const sources = action.modeSources ?? [];
  if (!action.isD20 || sources.length === 0) return null;
  const mode = action.mode ?? "NORMAL";
  const tone = mode === "ADVANTAGE" ? "text-emerald-300" : mode === "DISADVANTAGE" ? "text-rose-300" : "text-slate-300";
  const label = mode === "ADVANTAGE" ? "▲ Перевага" : mode === "DISADVANTAGE" ? "▼ Перешкода" : "Перевага й перешкода гасяться";
  return <div className={cn("mt-0.5 text-[11px] font-semibold", tone)}>{label} · {sources.join(", ")}</div>;
}

export function describeOutcome(outcome: DiceRollOutcome): string {
  const extras = (outcome.extraValues ?? []).map((die) => ` ${die.sign > 0 ? "+" : "−"} ${die.value} (${die.label})`).join("");
  const bonus = `${extras}${outcome.bonus ? ` ${outcome.bonus > 0 ? "+" : "−"} ${Math.abs(outcome.bonus)}` : ""}`;
  if (outcome.d20Mode === null) return `${outcome.dieValues.join(" + ")}${bonus}`;
  const natural = outcome.baseValue === 20 ? " · натуральна 20!" : outcome.baseValue === 1 ? " · натуральна 1" : "";
  if (outcome.d20Mode === "NORMAL") return `${outcome.baseValue}${bonus}${natural}`;
  const modeLabel = outcome.d20Mode === "ADVANTAGE" ? "перевага" : "перешкода";
  return `${modeLabel}: ${outcome.dieValues.join(" / ")} → ${outcome.baseValue}${bonus}${natural}`;
}
