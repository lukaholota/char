"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsOnline } from "@/hooks/useIsOnline";
import { describeCharges, findMaxChargesPerUse, findSpellLevelForCharges, type ItemSpellUse } from "@/rules/magic-item-spell-uses";
import { STATUS_SECTION_CLASS } from "./MagicItemSheetStatus";

type Props = { use: ItemSpellUse; chargesLeft: number | null; isPending: boolean; onUse: (charges: number) => void };

export function MagicItemSpellUsePanel({ use, chargesLeft, isPending, onUse }: Props) {
  const isOnline = useIsOnline();
  const maxCharges = findMaxChargesPerUse(use, chargesLeft);
  const [wanted, setWanted] = useState(1);
  const count = Math.max(1, Math.min(wanted, maxCharges));
  const isEmpty = maxCharges < 1;
  const summary = [`${findSpellLevelForCharges(use, count)} рівень`, use.saveDC ? `СК ${use.saveDC}` : null, chargesLeft !== null && !isEmpty ? `лишиться ${chargesLeft - count}` : null].filter(Boolean).join(" · ");

  return (
    <div className={`${STATUS_SECTION_CLASS} text-sm`}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center">
          <Button type="button" variant="ghost" size="icon" className="h-11 w-11" aria-label="Менше" disabled={isEmpty || count <= 1} onClick={() => setWanted(count - 1)}>
            <Minus className="h-4 w-4" aria-hidden />
          </Button>
          <span aria-live="polite" className="min-w-[7.5rem] text-center tabular-nums text-slate-100">{describeCharges(use, isEmpty ? 0 : count)}</span>
          <Button type="button" variant="ghost" size="icon" className="h-11 w-11" aria-label="Більше" disabled={isEmpty || count >= maxCharges} onClick={() => setWanted(count + 1)}>
            <Plus className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        <Button type="button" className="ml-auto h-11" disabled={isEmpty || isPending || !isOnline} onClick={() => onUse(count)}>
          {use.actionLabel}
        </Button>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {isEmpty ? `Не лишилось ${use.chargeForms.many}.` : !isOnline ? "Потрібен інтернет." : chargesLeft === null ? `${summary}. Задайте лічильник у рядку предмета, щоб лист їх рахував.` : `${summary}.`}
      </p>
    </div>
  );
}
