"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { ADDED_DAMAGE_KEY } from "@/lib/components/game/build-game-roll";
import type { DiceRollAction } from "@/lib/stores/diceUIStore";
import { cn } from "@/lib/utils";
import { D20Icon } from "@/lib/components/icons/D20Icon";

const SIDES = [4, 6, 8, 10, 12] as const;
const MAX_DICE = 20;
const BUTTON = "min-h-11 rounded-xl border text-sm font-semibold transition active:scale-95 disabled:opacity-50 disabled:active:scale-100";

type StagedDice = { sides: number; count: number };

/// Божественна кара чи Прихована атака докидаються після влучання окремим кидком шкоди в ту саму ціль.
export function AddedDamageDice({ disabled, onRoll }: { disabled: boolean; onRoll: (action: DiceRollAction) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [staged, setStaged] = useState<StagedDice | null>(null);

  if (!isOpen) {
    return (
      <button type="button" onClick={() => setIsOpen(true)} className={cn(BUTTON, "flex w-full items-center justify-center gap-1.5 border-white/10 bg-slate-900/60 text-slate-200 hover:bg-slate-800")}>
        <Plus className="h-4 w-4" aria-hidden />
        Докинути кубики до шкоди
      </button>
    );
  }

  const roll = () => {
    if (!staged) return;
    onRoll(buildAddedDamageAction(staged));
    setStaged(null);
  };

  return (
    <div role="group" aria-label="Докинути кубики до шкоди" className="space-y-2 rounded-xl border border-white/10 bg-slate-900/40 p-2">
      <div className="px-1 text-xs text-slate-300">Крит, кара чи Прихована атака — окремим кидком у ту саму ціль</div>
      <div className="grid grid-cols-5 gap-1.5">
        {SIDES.map((sides) => (
          <button
            key={sides}
            type="button"
            onClick={() => setStaged((current) => addDie(current, sides))}
            aria-label={`Додати к${sides}`}
            className={cn(BUTTON, staged?.sides === sides ? "border-amber-400/50 bg-amber-500/20 text-amber-50" : "border-white/10 bg-slate-900/60 text-slate-200 hover:bg-slate-800")}
          >
            +к{sides}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <button type="button" disabled={disabled || !staged} onClick={roll} className={cn(BUTTON, "flex items-center justify-center gap-1.5 border-amber-400/50 bg-amber-500/20 text-amber-50")}>
          <D20Icon className="h-4 w-4" />
          {staged ? `Кинути ${staged.count}к${staged.sides}` : "Оберіть кубики"}
        </button>
        <button type="button" disabled={!staged} onClick={() => setStaged(null)} aria-label="Прибрати обрані кубики" className={cn(BUTTON, "flex w-11 items-center justify-center border-white/10 bg-slate-900/60 text-slate-300 hover:bg-slate-800")}>
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function addDie(current: StagedDice | null, sides: number): StagedDice {
  return current?.sides === sides ? { sides, count: Math.min(MAX_DICE, current.count + 1) } : { sides, count: 1 };
}

function buildAddedDamageAction({ sides, count }: StagedDice): DiceRollAction {
  return { key: ADDED_DAMAGE_KEY, label: "Докинута шкода", count, sides, bonus: 0, isD20: false };
}
