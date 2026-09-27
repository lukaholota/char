"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ClassSpellChoiceStep } from "@/components/spells/ClassSpellChoiceStep";
import { FeatSpellChoiceStep } from "@/components/spells/FeatSpellChoiceStep";
import { getCreationClassOptionSpellOffer, getCreationSpellOffer } from "@/lib/actions/class-actions";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import type { ClassI } from "@/lib/types/model-types";
import type { ClassSpellOffer, ClassSpellSelection } from "@/rules/class-spell-choices-2024";
import type { ClassOptionSpellOffer } from "@/server/db/class-option-spell-choices";

interface Props {
  selectedClass?: ClassI | null;
  formId: string;
  onNextDisabledChange?: (disabled: boolean) => void;
}

/** Заклинач обирає замовляння, заклинання й книгу чарівника на 1-му рівні (2024 — Р43, 2014 — Р44); Pact of the Tome — ще й Книгу тіней, домен природи, смерті чи магії й Божественна душа 2014 — заклинання своєї риси. */
export const CreationSpellsForm = ({ selectedClass, formId, onNextDisabledChange }: Props) => {
  const { formData, updateFormData, nextStep } = usePersFormStore();
  const classChoiceOptionIds = useMemo(() => collectOptionIds(formData.classChoiceSelections), [formData.classChoiceSelections]);
  const subclassChoiceOptionIds = useMemo(() => collectOptionIds(formData.subclassChoiceSelections), [formData.subclassChoiceSelections]);
  const offer = useCreationSpellOffer(selectedClass?.classId, formData.subclassId ?? null, [...classChoiceOptionIds, ...subclassChoiceOptionIds]);
  const classSpellIds = useMemo(() => collectClassSpellIds(formData.classSpells), [formData.classSpells]);
  const optionSpellOffer = useCreationClassOptionSpellOffer(classChoiceOptionIds, formData.subclassId ?? null);
  const [isClassComplete, setIsClassComplete] = useState(false);
  const [isOptionSpellsComplete, setIsOptionSpellsComplete] = useState(false);
  const isComplete = isClassComplete && optionSpellOffer !== undefined && (!optionSpellOffer || isOptionSpellsComplete);
  const hasStaleOptionSpells = optionSpellOffer === null && (formData.classOptionSpellIds?.length ?? 0) > 0;

  useEffect(() => {
    onNextDisabledChange?.(!isComplete);
  }, [isComplete, onNextDisabledChange]);

  useEffect(() => {
    if (hasStaleOptionSpells) updateFormData({ classOptionSpellIds: [] });
  }, [hasStaleOptionSpells, updateFormData]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (isComplete) nextStep();
  };

  return (
    <form id={formId} onSubmit={submit} className="space-y-6">
      <h2 className="text-center font-rpg-display text-3xl font-semibold uppercase tracking-widest text-slate-200 sm:text-4xl">Заклинання</h2>
      {offer ? (
        <ClassSpellChoiceStep offer={offer} onNextDisabledChange={(disabled) => setIsClassComplete(!disabled)} />
      ) : (
        <p className="text-center text-sm text-slate-400">Завантажуємо список заклинань…</p>
      )}
      {optionSpellOffer && (
        <section aria-label={optionSpellOffer.label} className="glass-card space-y-3 rounded-2xl border border-white/10 p-4">
          <h3 className="text-lg font-semibold text-slate-100">{optionSpellOffer.label}</h3>
          <FeatSpellChoiceStep
            featLabel={optionSpellOffer.label}
            offer={optionSpellOffer.offer}
            selectedIds={formData.classOptionSpellIds ?? []}
            excludedSpellIds={classSpellIds}
            onChange={(classOptionSpellIds) => updateFormData({ classOptionSpellIds })}
            onCompleteChange={setIsOptionSpellsComplete}
          />
        </section>
      )}
    </form>
  );
};

/** Рід Джина — вибір підкласу: він прибирає з розширеного списку заклинання інших родів. */
function useCreationSpellOffer(classId: number | undefined, subclassId: number | null, chosenOptionIds: number[]): ClassSpellOffer | null {
  const [offer, setOffer] = useState<ClassSpellOffer | null>(null);
  const optionKey = chosenOptionIds.join(",");

  useEffect(() => {
    if (!classId) return;
    let isCurrent = true;
    getCreationSpellOffer(classId, optionKey ? optionKey.split(",").map(Number) : [], subclassId).then((loaded) => {
      if (isCurrent) setOffer(loaded);
    });
    return () => {
      isCurrent = false;
    };
  }, [classId, subclassId, optionKey]);

  return offer;
}

/** `undefined` — ще вантажиться, `null` — обирати нічого. */
function useCreationClassOptionSpellOffer(classChoiceOptionIds: number[], subclassId: number | null): ClassOptionSpellOffer | null | undefined {
  const [offer, setOffer] = useState<ClassOptionSpellOffer | null | undefined>(undefined);
  const optionKey = classChoiceOptionIds.join(",");

  useEffect(() => {
    let isCurrent = true;
    getCreationClassOptionSpellOffer(optionKey ? optionKey.split(",").map(Number) : [], [], subclassId).then((loaded) => {
      if (isCurrent) setOffer(loaded);
    });
    return () => {
      isCurrent = false;
    };
  }, [optionKey, subclassId]);

  return offer;
}

function collectClassSpellIds(classSpells: ClassSpellSelection | undefined): number[] {
  return [...(classSpells?.cantripIds ?? []), ...(classSpells?.spellbookIds ?? []), ...(classSpells?.preparedIds ?? [])];
}

function collectOptionIds(selections: Record<string, number | number[]> | undefined): number[] {
  return Object.values(selections ?? {})
    .flat()
    .filter((id): id is number => Number.isInteger(id) && id > 0)
    .sort((a, b) => a - b);
}

export default CreationSpellsForm;
