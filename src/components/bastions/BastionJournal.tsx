"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { BastionRemoveButton } from "@/components/bastions/BastionRemoveButton";
import { BastionTurnFields } from "@/components/bastions/BastionTurnFields";
import { bastionSectionClassName } from "@/components/bastions/bastion-field-styles";
import { Button } from "@/components/ui/button";
import { removeTurn, saveTurn } from "@/lib/actions/bastion-actions";
import type { BastionRecord, BastionStanding, BastionTurnRecord } from "@/server/db/bastions";

export function BastionJournal({
  persId,
  bastion,
  onChanged,
}: {
  persId: number;
  bastion: BastionRecord;
  onChanged: (next: BastionStanding) => void;
}) {
  const newestFirst = [...bastion.turns].reverse();

  return (
    <section className={bastionSectionClassName} aria-labelledby="bastion-journal">
      <h2 id="bastion-journal" className="text-lg font-semibold text-slate-50">
        Журнал ходів
      </h2>

      {newestFirst.length === 0 ? (
        <p className="text-sm text-slate-400">Записів ще немає. Коли бастіон зробить хід, запишіть результат кнопкою «Записати хід».</p>
      ) : (
        <ol className="space-y-4 border-l border-white/10 pl-4">
          {newestFirst.map((turn) => (
            <li key={turn.turnId}>
              <BastionTurnEntry persId={persId} turn={turn} onChanged={onChanged} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function BastionTurnEntry({
  persId,
  turn,
  onChanged,
}: {
  persId: number;
  turn: BastionTurnRecord;
  onChanged: (next: BastionStanding) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [turnNumber, setTurnNumber] = useState(String(turn.turnNumber));
  const [entry, setEntry] = useState(turn.entry);
  const [isPending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      const result = await saveTurn({ persId, turnId: turn.turnId, turnNumber: Number(turnNumber), entry });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setIsEditing(false);
      onChanged(result.standing);
      toast.success("Запис збережено");
    });
  };

  const remove = () => {
    startTransition(async () => {
      const result = await removeTurn({ persId, turnId: turn.turnId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onChanged(result.standing);
      toast.success("Запис видалено");
    });
  };

  const cancel = () => {
    setTurnNumber(String(turn.turnNumber));
    setEntry(turn.entry);
    setIsEditing(false);
  };

  return (
    <article className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h3 className="text-base font-semibold text-slate-100">Хід №{turn.turnNumber}</h3>
          <span className="text-sm text-slate-400">{format(new Date(turn.createdAt), "d MMMM yyyy", { locale: uk })}</span>
        </div>
        {isEditing ? null : (
          <div className="flex shrink-0 gap-1">
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} disabled={isPending} className="text-slate-300" aria-label="Редагувати запис">
              <Pencil className="h-4 w-4" />
            </Button>
            <BastionRemoveButton label="Видалити запис" confirmLabel="Видалити?" isIconOnly isPending={isPending} onConfirm={remove} />
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <BastionTurnFields turnNumber={turnNumber} entry={entry} onTurnNumberChange={setTurnNumber} onEntryChange={setEntry} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={save} disabled={isPending}>
              Зберегти запис
            </Button>
            <Button size="sm" variant="ghost" onClick={cancel} disabled={isPending}>
              Скасувати
            </Button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{turn.entry}</p>
      )}
    </article>
  );
}
