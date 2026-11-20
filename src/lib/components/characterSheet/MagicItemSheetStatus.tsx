import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { describeMagicItemEffect } from "@/lib/logic/magic-item-effect-text";
import { describeActivationAction, describeMissingSteps, type MagicItemActivationStep } from "@/lib/logic/magic-item-activation";
import { describeStatePart } from "@/lib/logic/state-labels";
import { buildItemStateKey, type MagicItemState } from "@/rules/magic-item-states";
import { describeDrinkVerb, describeHealingDice, findPotionHealingDice, findPotionTempHp } from "@/rules/potions";
import { useIsOnline } from "@/hooks/useIsOnline";
import { useSheetStatesContext } from "./states/SheetStatesContext";

export const STATUS_SECTION_CLASS = "mb-3 border-b border-white/10 pb-3 last:mb-0 last:border-b-0 last:pb-0";

type Props = {
  missingSteps: MagicItemActivationStep[];
  manualOverlaps: string[];
  hasCountedEffects: boolean;
  activationLabel?: string;
  isReadOnly?: boolean;
  isPending?: boolean;
  onActivate: (step: MagicItemActivationStep) => void;
};

export function MagicItemSheetStatus({ missingSteps, manualOverlaps, hasCountedEffects, activationLabel, isReadOnly, isPending, onActivate }: Props) {
  if (missingSteps.length > 0) {
    const outcome = hasCountedEffects ? "і лист сам урахує ці бонуси" : `тоді зможете ${activationLabel?.toLowerCase() ?? "користуватися ним"}`;
    return (
      <div className={STATUS_SECTION_CLASS}>
        <p className="text-sm text-slate-300">Поки не діє: {describeMissingSteps(missingSteps)}, {outcome}.</p>
        {!isReadOnly && (
          <div className="mt-2 flex flex-wrap gap-2">
            {missingSteps.map((step) => (
              <Button key={step} size="sm" variant="secondary" disabled={isPending} onClick={() => onActivate(step)}>
                {describeActivationAction([step])}
              </Button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!hasCountedEffects) return null;
  return (
    <div className={`${STATUS_SECTION_CLASS} text-sm`}>
      <p className="flex items-start gap-2 text-emerald-300">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        Діє зараз — лист уже враховує ці бонуси.
      </p>
      {manualOverlaps.length > 0 && (
        <p className="mt-2 text-amber-200/90">
          У вас є ручний бонус до {manualOverlaps.join(", ")}. Якщо ви вписали його за цей предмет — приберіть, бо інакше він рахується двічі.
        </p>
      )}
    </div>
  );
}

/// Каптур, підбори, крила: гравець вмикає ефект, коли робить це в грі; лист і кубики рахують його, доки не вимкнуть.
export function MagicItemStateSwitch({ magicItemId, state }: { magicItemId: number; state: MagicItemState }) {
  const control = useSheetStatesContext();
  if (!control) return null;

  const isOn = control.itemStates.some((item) => item.magicItemId === magicItemId && item.isSwitchedOn);
  const summary = describeItemState(magicItemId, state);
  return (
    <div className={`${STATUS_SECTION_CLASS} text-sm`}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className={isOn ? "font-semibold text-emerald-300" : "font-semibold text-slate-100"}>{isOn ? "Увімкнено" : state.activationLabel}</p>
          <p className="mt-0.5 text-xs leading-snug text-slate-400">{summary.join(" · ")}</p>
        </div>
        {control.isReadOnly ? null : (
          <Button size="sm" variant={isOn ? "secondary" : "default"} aria-pressed={isOn} onClick={() => control.setItemState(magicItemId, !isOn)}>
            {isOn ? "Вимкнути" : "Увімкнути"}
          </Button>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {isOn
          ? "Лист і кубики вже це враховують. Видно в «Станах» угорі листа; вимикається тут, там або відпочинком."
          : "Увімкніть, коли робите це в грі, — лист і кубики врахують ефект."}
      </p>
    </div>
  );
}

function describeItemState(magicItemId: number, state: MagicItemState): string[] {
  return [...state.effects.map(describeMagicItemEffect), ...describeStatePart(state.findPart(buildItemStateKey(magicItemId)))];
}

type PotionItem = { magicItemId: number; engName: string | null };

export function PotionDrinkPanel({ item, state, isAtFullHp, isReadOnly, isPending, onDrink }: { item: PotionItem; state: MagicItemState | null; isAtFullHp: boolean; isReadOnly?: boolean; isPending: boolean; onDrink: () => void }) {
  const isOnline = useIsOnline();
  const outcomes = listPotionOutcomes(item, state);
  return (
    <div className={`${STATUS_SECTION_CLASS} text-sm`}>
      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-1 text-slate-200">
          {outcomes.length > 0 ? outcomes.join(" · ") : "Ефект зілля лист не рахує — застосуйте його самі."}
        </p>
        {isReadOnly ? null : (
          <Button size="sm" disabled={isPending || !isOnline} onClick={onDrink}>
            {describeDrinkVerb(item)}
          </Button>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {isReadOnly ? "Одноразовий предмет." : !isOnline ? "Потрібен інтернет." : isAtFullHp && isHealingOnly(item, state) ? "ХП уже повні — лікування нічого не додасть, а предмет зникне." : "Предмет зникне зі спорядження."}
      </p>
    </div>
  );
}

function isHealingOnly(item: PotionItem, state: MagicItemState | null): boolean {
  return findPotionHealingDice(item) !== null && findPotionTempHp(item) === 0 && state === null;
}

function listPotionOutcomes(item: PotionItem, state: MagicItemState | null): string[] {
  const dice = findPotionHealingDice(item);
  const tempHp = findPotionTempHp(item);
  return [
    ...(dice ? [`Відновить ${describeHealingDice(dice)} ХП`] : []),
    ...(tempHp > 0 ? [`${tempHp} тимчасових ХП`] : []),
    ...(state ? describeItemState(item.magicItemId, state) : []),
  ];
}
