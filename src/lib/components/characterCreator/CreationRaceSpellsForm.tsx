"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { FeatSpellChoiceStep } from "@/components/spells/FeatSpellChoiceStep";
import { getCreationRaceSpellOffer } from "@/lib/actions/class-actions";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import type { RaceSpellOffer2014 } from "@/server/db/race-spell-choices-2014";

interface Props {
  formId: string;
  onNextDisabledChange?: (disabled: boolean) => void;
}

/** O48 — замовляння, яке раса 2014 дає обрати: Високий ельф, Кобольд із Драконячим чаклунством, Астральний ельф. */
export const CreationRaceSpellsForm = ({ formId, onNextDisabledChange }: Props) => {
  const { formData, updateFormData, nextStep } = usePersFormStore();
  const offer = useCreationRaceSpellOffer(formData.raceId, formData.subraceId ?? null, formData.raceChoiceSelections);
  const takenSpellIds = useMemo(
    () => [...(formData.classSpells?.cantripIds ?? []), ...(formData.classSpells?.spellbookIds ?? []), ...(formData.classSpells?.preparedIds ?? []), ...(formData.classOptionSpellIds ?? [])],
    [formData.classSpells, formData.classOptionSpellIds],
  );
  const [isPickComplete, setIsPickComplete] = useState(false);
  const isComplete = offer !== undefined && (offer === null || isPickComplete);

  useEffect(() => {
    onNextDisabledChange?.(!isComplete);
  }, [isComplete, onNextDisabledChange]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (isComplete) nextStep();
  };

  return (
    <form id={formId} onSubmit={submit} className="space-y-6">
      <h2 className="text-center font-rpg-display text-3xl font-semibold uppercase tracking-widest text-slate-200 sm:text-4xl">Заклинання раси</h2>
      {offer === undefined && <p className="text-center text-sm text-slate-400">Завантажуємо список заклинань…</p>}
      {offer && (
        <div className="glass-card rounded-2xl border border-white/10 p-4">
          <FeatSpellChoiceStep
            featLabel={offer.label}
            offer={offer.offer}
            selectedIds={formData.raceSpellIds ?? []}
            excludedSpellIds={takenSpellIds}
            onChange={(raceSpellIds) => updateFormData({ raceSpellIds })}
            onCompleteChange={setIsPickComplete}
          />
        </div>
      )}
    </form>
  );
};

/** `undefined` — ще вантажиться, `null` — обирати нічого. */
function useCreationRaceSpellOffer(
  raceId: number | undefined,
  subraceId: number | null,
  raceChoiceSelections: Record<string, number> | undefined,
): RaceSpellOffer2014 | null | undefined {
  const [offer, setOffer] = useState<RaceSpellOffer2014 | null | undefined>(undefined);
  const optionKey = Object.values(raceChoiceSelections ?? {})
    .filter((id) => Number.isInteger(id) && id > 0)
    .sort((a, b) => a - b)
    .join(",");

  useEffect(() => {
    if (!raceId) return;
    let isCurrent = true;
    getCreationRaceSpellOffer(raceId, subraceId, optionKey ? optionKey.split(",").map(Number) : [], []).then((loaded) => {
      if (isCurrent) setOffer(loaded);
    });
    return () => {
      isCurrent = false;
    };
  }, [raceId, subraceId, optionKey]);

  return offer;
}

export default CreationRaceSpellsForm;
