"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { FeatSpellChoiceStep } from "@/components/spells/FeatSpellChoiceStep";
import { getCreationFeatSpellOffer } from "@/lib/actions/feat-spell-actions";
import { featTranslations } from "@/lib/refs/translation";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import type { FeatSpellChoiceOffer } from "@/rules/feat-spell-choices";

export type CreationFeatSpellSource = "BACKGROUND_ORIGIN" | "SPECIES_VERSATILITY";

export type CreationSpellFeat = {
  source: CreationFeatSpellSource;
  featId: number;
  featName: string;
  selections: Record<string, number | number[]> | undefined;
};

interface Props {
  feats: readonly CreationSpellFeat[];
  formId: string;
  onNextDisabledChange?: (disabled: boolean) => void;
}

const SOURCE_LABELS: Record<CreationFeatSpellSource, string> = {
  BACKGROUND_ORIGIN: "від передісторії",
  SPECIES_VERSATILITY: "від виду",
};

/** KR31.5 — «Посвячений у магію» від передісторії чи Людини 2024 просить два замовляння й заклинання 1-го рівня. */
export const CreationFeatSpellsForm = ({ feats, formId, onNextDisabledChange }: Props) => {
  const { formData, updateFormData, nextStep } = usePersFormStore();
  const [completeSources, setCompleteSources] = useState<Partial<Record<CreationFeatSpellSource, boolean>>>({});
  const isComplete = feats.every((feat) => completeSources[feat.source]);

  useEffect(() => {
    onNextDisabledChange?.(!isComplete);
  }, [isComplete, onNextDisabledChange]);

  const reportComplete = useCallback((source: CreationFeatSpellSource, isSourceComplete: boolean) => {
    setCompleteSources((current) => (current[source] === isSourceComplete ? current : { ...current, [source]: isSourceComplete }));
  }, []);

  const selections = formData.featSpellSelections ?? {};
  const classSpellIds = useMemo(() => collectClassSpellIds(formData.classSpells), [formData.classSpells]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (isComplete) nextStep();
  };

  return (
    <form id={formId} onSubmit={submit} className="space-y-6">
      <h2 className="text-center font-rpg-display text-3xl font-semibold uppercase tracking-widest text-slate-200 sm:text-4xl">Заклинання риси</h2>
      {feats.map((feat) => (
        <CreationFeatSpellSection
          key={feat.source}
          feat={feat}
          selectedIds={selections[feat.source] ?? []}
          excludedSpellIds={[...classSpellIds, ...collectOtherSourceIds(selections, feat.source)]}
          onChange={(spellIds) => updateFormData({ featSpellSelections: { ...selections, [feat.source]: spellIds } })}
          onCompleteChange={reportComplete}
        />
      ))}
    </form>
  );
};

function CreationFeatSpellSection(props: {
  feat: CreationSpellFeat;
  selectedIds: number[];
  excludedSpellIds: number[];
  onChange: (spellIds: number[]) => void;
  onCompleteChange: (source: CreationFeatSpellSource, isComplete: boolean) => void;
}) {
  const { feat, onCompleteChange } = props;
  const offer = useCreationFeatSpellOffer(feat);
  const reportComplete = useCallback((isComplete: boolean) => onCompleteChange(feat.source, isComplete), [feat.source, onCompleteChange]);

  useEffect(() => {
    if (offer === null) onCompleteChange(feat.source, true);
  }, [offer, feat.source, onCompleteChange]);

  if (offer === undefined) return <p className="text-center text-sm text-slate-400">Завантажуємо список заклинань…</p>;
  if (offer === null) return null;

  return (
    <div className="glass-card rounded-2xl border border-white/10 p-4">
      <FeatSpellChoiceStep
        featLabel={`${featTranslations[feat.featName as keyof typeof featTranslations] ?? feat.featName} (${SOURCE_LABELS[feat.source]})`}
        offer={offer}
        selectedIds={props.selectedIds}
        excludedSpellIds={props.excludedSpellIds}
        onChange={props.onChange}
        onCompleteChange={reportComplete}
      />
    </div>
  );
}

function useCreationFeatSpellOffer(feat: CreationSpellFeat): FeatSpellChoiceOffer | null | undefined {
  const [offer, setOffer] = useState<FeatSpellChoiceOffer | null | undefined>(undefined);
  const optionKey = Object.values(feat.selections ?? {})
    .flat()
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0)
    .sort((a, b) => a - b)
    .join(",");

  useEffect(() => {
    let isCurrent = true;
    getCreationFeatSpellOffer(feat.featId, optionKey ? optionKey.split(",").map(Number) : []).then((loaded) => {
      if (isCurrent) setOffer(loaded);
    });
    return () => {
      isCurrent = false;
    };
  }, [feat.featId, optionKey]);

  return offer;
}

/** Р38: заклинання лише в книзі чарівника риса взяти може — підготовленим його робить риса, а не клас. */
function collectClassSpellIds(classSpells: { cantripIds?: number[]; preparedIds?: number[] } | undefined): number[] {
  return [...(classSpells?.cantripIds ?? []), ...(classSpells?.preparedIds ?? [])];
}

function collectOtherSourceIds(selections: Partial<Record<CreationFeatSpellSource, number[]>>, source: CreationFeatSpellSource): number[] {
  return Object.entries(selections).flatMap(([otherSource, spellIds]) => (otherSource === source ? [] : spellIds ?? []));
}

export default CreationFeatSpellsForm;
