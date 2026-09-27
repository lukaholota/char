"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeatSpellChoiceStep } from "@/components/spells/FeatSpellChoiceStep";
import { getLevelUpCatchUpSpellOffers } from "@/lib/actions/levelup";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import type { CatchUpSpellOffer } from "@/server/db/catch-up-spell-choices-2014";

/**
 * KR48.7 — вибір, який персонаж 2014 пропустив до KR48.6. Заклинання, яке гравець уже тримає сам і яке тут
 * підходить, позначене наперед — лишається лише підтвердити.
 */
export function useLevelUpCatchUpSpellOffers(persId: number | undefined): CatchUpSpellOffer[] {
  const [offers, setOffers] = useState<CatchUpSpellOffer[]>([]);
  const { updateFormData } = usePersFormStore();

  useEffect(() => {
    if (!persId) return;
    let isCurrent = true;
    getLevelUpCatchUpSpellOffers(persId).then((loaded) => {
      if (!isCurrent) return;
      setOffers(loaded);
      const selections = usePersFormStore.getState().formData.catchUpSpellSelections ?? {};
      const preselected = Object.fromEntries(loaded.filter((offer) => !(offer.sourceName in selections)).map((offer) => [offer.sourceName, offer.preselectedSpellIds]));
      if (Object.keys(preselected).length) updateFormData({ catchUpSpellSelections: { ...selections, ...preselected } });
    });
    return () => {
      isCurrent = false;
    };
  }, [persId, updateFormData]);

  return offers;
}

export function collectCatchUpSpellIds(formData: Partial<PersFormData>): number[] {
  return Object.values(formData.catchUpSpellSelections ?? {}).flat();
}

export function LevelUpCatchUpSpellStep({ offers, onNextDisabledChange }: { offers: readonly CatchUpSpellOffer[]; onNextDisabledChange?: (disabled: boolean) => void }) {
  const { formData, updateFormData } = usePersFormStore();
  const [completeSources, setCompleteSources] = useState<Record<string, boolean>>({});
  const isComplete = offers.every((offer) => completeSources[offer.sourceName]);
  const selections = formData.catchUpSpellSelections ?? {};
  const chosenElsewhere = useMemo(
    () => [...(formData.featSpellIds ?? []), ...(formData.featGrowthSpellIds ?? []), ...(formData.classOptionSpellIds ?? []), ...Object.values(formData.classSpells ?? {}).flat()].filter((id): id is number => typeof id === "number"),
    [formData.featSpellIds, formData.featGrowthSpellIds, formData.classOptionSpellIds, formData.classSpells],
  );

  useEffect(() => {
    onNextDisabledChange?.(!isComplete);
  }, [isComplete, onNextDisabledChange]);

  const reportComplete = useCallback((sourceName: string, isSourceComplete: boolean) => {
    setCompleteSources((current) => (current[sourceName] === isSourceComplete ? current : { ...current, [sourceName]: isSourceComplete }));
  }, []);

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Обрати пропущене</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-slate-400">
          Цей вибір ваш персонаж мав зробити раніше, але білдер його ще не питав. Якщо заклинання вже є у вас на листі — оберіть його: воно перейде сюди й звільнить місце.
        </p>
        {offers.map((offer) => (
          <section key={offer.sourceName} aria-label={offer.label} className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-100">{offer.label}</h3>
            <FeatSpellChoiceStep
              featLabel={offer.label}
              offer={offer.offer}
              selectedIds={selections[offer.sourceName] ?? []}
              excludedSpellIds={[...chosenElsewhere, ...Object.entries(selections).flatMap(([sourceName, spellIds]) => (sourceName === offer.sourceName ? [] : spellIds))]}
              onChange={(spellIds) => updateFormData({ catchUpSpellSelections: { ...selections, [offer.sourceName]: spellIds } })}
              onCompleteChange={(isSourceComplete) => reportComplete(offer.sourceName, isSourceComplete)}
            />
          </section>
        ))}
      </CardContent>
    </Card>
  );
}
