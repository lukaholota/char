"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FeatSpellChoiceStep } from "@/components/spells/FeatSpellChoiceStep";
import FeatChoiceOptionsForm from "@/lib/components/characterCreator/FeatChoiceOptionsForm";
import { getSheetFeatSpellOffer, type SheetFeatAcquisitionContent } from "@/lib/actions/feat-actions";
import { activateSheetFeatDraftStorage, usePersFormStore } from "@/lib/stores/persFormStore";
import type { SheetFeatExistingState } from "@/lib/components/characterSheet/feats/sheet-feat-existing-state";
import type { FeatSpellChoiceOffer } from "@/rules/feat-spell-choices";

const FORM_ID = "sheet-feat-choices";
const CHOICES_STEP = 1;

type Props = {
  persId: number;
  existing: SheetFeatExistingState;
  featLabel: string;
  content: SheetFeatAcquisitionContent;
  isSubmitting: boolean;
  onClose: () => void;
  onAcquire: (selection: { choiceOptionIds: number[]; featSpellIds: number[] }) => void;
};

// Та сама форма виборів, що в майстрі підвищення: окрема чернетка, щоб не зачепити конструктор.
export function FeatAcquisitionDialog({ persId, existing, featLabel, content, isSubmitting, onClose, onAcquire }: Props) {
  activateSheetFeatDraftStorage();
  const { formData, currentStep, resetForm, prevStep } = usePersFormStore();
  const [choicesIncomplete, setChoicesIncomplete] = useState(true);
  const [spellIds, setSpellIds] = useState<number[]>([]);
  const [spellsComplete, setSpellsComplete] = useState(false);
  const hasChoices = content.feat.featChoiceOptions.length > 0;
  const isChoosing = hasChoices && currentStep === CHOICES_STEP;
  const choiceOptionIds = useMemo(() => flattenSelections(formData.featChoiceSelections), [formData.featChoiceSelections]);
  const spellOffer = useFeatSpellOffer({ persId, content, choiceOptionIds, enabled: !isChoosing });

  useEffect(() => {
    resetForm();
  }, [content.feat.featId, resetForm]);

  const canAcquire = !isChoosing && (!content.hasSpellChoice || (spellOffer !== null && spellsComplete));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{featLabel}</DialogTitle>
        </DialogHeader>

        {isChoosing ? (
          <FeatChoiceOptionsForm
            selectedFeat={content.feat}
            formId={FORM_ID}
            onNextDisabledChange={setChoicesIncomplete}
            baseAbilityScores={existing.abilityScores}
            extraExistingSkills={existing.skills}
            extraExistingExpertises={existing.expertises}
            extraExistingChoiceOptionIds={existing.choiceOptionIds}
          />
        ) : content.hasSpellChoice ? (
          spellOffer ? (
            <FeatSpellChoiceStep featLabel={featLabel} offer={spellOffer} selectedIds={spellIds} onChange={setSpellIds} onCompleteChange={setSpellsComplete} />
          ) : (
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-amber-400" />
          )
        ) : (
          <p className="text-sm text-slate-300">Вибори зроблено. Риса дасть свої надання одразу після додавання.</p>
        )}

        <div className="flex items-center justify-end gap-2">
          {hasChoices && !isChoosing ? (
            <Button type="button" variant="secondary" onClick={prevStep}>
              Назад
            </Button>
          ) : null}
          {isChoosing ? (
            <Button type="submit" form={FORM_ID} disabled={choicesIncomplete}>
              Далі
            </Button>
          ) : (
            <Button type="button" disabled={!canAcquire || isSubmitting} onClick={() => onAcquire({ choiceOptionIds, featSpellIds: spellIds })}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Додати рису"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function useFeatSpellOffer(input: { persId: number; content: SheetFeatAcquisitionContent; choiceOptionIds: number[]; enabled: boolean }) {
  const { persId, content, choiceOptionIds, enabled } = input;
  const [offer, setOffer] = useState<FeatSpellChoiceOffer | null>(null);
  const optionKey = choiceOptionIds.join(",");

  useEffect(() => {
    if (!enabled || !content.hasSpellChoice) return;
    let cancelled = false;
    setOffer(null);
    getSheetFeatSpellOffer(persId, content.feat.featId, optionKey ? optionKey.split(",").map(Number) : []).then((loaded) => {
      if (!cancelled) setOffer(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [persId, content.feat.featId, content.hasSpellChoice, optionKey, enabled]);

  return offer;
}

function flattenSelections(selections: Record<string, number | number[]> | undefined): number[] {
  return Object.values(selections ?? {}).flatMap((value) => (Array.isArray(value) ? value : [value])).map(Number).filter((id) => Number.isInteger(id) && id > 0);
}
