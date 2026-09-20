"use client";

import { useState, useTransition } from "react";
import { NotebookPen } from "lucide-react";
import { toast } from "sonner";
import { BastionMaintainToggle, BastionRulesLink } from "@/components/bastions/BastionFacilityBasics";
import { BastionTurnFields } from "@/components/bastions/BastionTurnFields";
import { bastionSectionClassName } from "@/components/bastions/bastion-field-styles";
import { Button } from "@/components/ui/button";
import { addTurn } from "@/lib/actions/bastion-actions";
import { bastionOrderTranslations } from "@/lib/refs/translation";
import { describeTurnOrders, findNextTurnNumber, findTurnOrders } from "@/rules/bastions";
import type { BastionFacilityView, BastionRecord, BastionStanding } from "@/server/db/bastions";

/// Хід бастіону застосунок не розвʼязує (Р26, KR19.5): панель зводить уже віддані накази й дає записати результат у журнал.
export function BastionTurnPanel({
  standing,
  bastion,
  views,
  onChanged,
}: {
  standing: BastionStanding;
  bastion: BastionRecord;
  views: readonly BastionFacilityView[];
  onChanged: (next: BastionStanding) => void;
}) {
  const orders = findTurnOrders(views);
  const nextTurnNumber = findNextTurnNumber(bastion.turns);

  return (
    <section className={bastionSectionClassName} aria-labelledby="bastion-turn">
      <div className="space-y-1">
        <h2 id="bastion-turn" className="text-lg font-semibold text-slate-50">
          Цей хід бастіону
        </h2>
        <p className="text-sm text-slate-400">Хід — раз на 7 ігрових днів. Накази віддаються в картках спеціальних приміщень.</p>
      </div>

      {orders.length > 0 ? (
        <ul className="space-y-1 text-sm text-slate-200">
          {orders.map((order) => (
            <li key={`${order.facilityName}-${order.orderCode}`} className="flex flex-wrap gap-x-2">
              <span className="font-semibold">{order.facilityName}</span>
              <span className="text-slate-400">→</span>
              <span>{bastionOrderTranslations[order.orderCode]}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-300">Наказів цього ходу ще немає.</p>
      )}

      <BastionMaintainToggle standing={standing} views={views} onChanged={onChanged} />

      <BastionTurnComposer
        key={nextTurnNumber}
        persId={standing.persId}
        nextTurnNumber={nextTurnNumber}
        draftEntry={describeTurnOrders({ isMaintaining: bastion.isMaintaining, orders })}
        onAdded={onChanged}
      />
    </section>
  );
}

function BastionTurnComposer({
  persId,
  nextTurnNumber,
  draftEntry,
  onAdded,
}: {
  persId: number;
  nextTurnNumber: number;
  draftEntry: string;
  onAdded: (next: BastionStanding) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [turnNumber, setTurnNumber] = useState(String(nextTurnNumber));
  const [entry, setEntry] = useState("");
  const [isPending, startTransition] = useTransition();

  const open = () => {
    setEntry(draftEntry);
    setIsOpen(true);
  };

  const add = () => {
    startTransition(async () => {
      const result = await addTurn({ persId, turnNumber: Number(turnNumber), entry });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setIsOpen(false);
      onAdded(result.standing);
      toast.success("Хід записано в журнал");
    });
  };

  if (!isOpen) {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button onClick={open} className="gap-2">
          <NotebookPen className="h-4 w-4" />
          Записати хід №{nextTurnNumber}
        </Button>
        <BastionRulesLink />
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl bg-slate-950/30 p-3">
      <BastionTurnFields
        turnNumber={turnNumber}
        entry={entry}
        entryPlaceholder="Бібліотека дослідила руїни, кузня закінчила лати"
        onTurnNumberChange={setTurnNumber}
        onEntryChange={setEntry}
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={add} disabled={isPending}>
          Записати в журнал
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setIsOpen(false)} disabled={isPending}>
          Скасувати
        </Button>
      </div>
    </div>
  );
}
