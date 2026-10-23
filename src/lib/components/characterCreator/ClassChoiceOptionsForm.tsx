"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ClassI } from "@/lib/types/model-types";
import { useStepForm } from "@/hooks/useStepForm";
import { classChoiceOptionsSchema } from "@/lib/zod/schemas/persCreateSchema";
import { Card } from "@/components/ui/card";
import { classTranslations, classTranslationsEng } from "@/lib/refs/translation";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { ChoiceOptionFeaturesDialog, type ChoiceOptionInfo } from "@/lib/components/characterCreator/ChoiceOptionFeaturesDialog";
import { ClassChoiceOptionGroups } from "@/lib/components/characterCreator/ClassChoiceOptionGroups";
import { RpgbotRecommendationToggle } from "@/components/spells/RpgbotRecommendationToggle";
import { useChoiceOptionRatings } from "@/hooks/useChoiceOptionRatings";

interface Props {
  selectedClass?: ClassI | null;
  availableOptions?: ClassI["classChoiceOptions"];
  formId: string;
  onNextDisabledChange?: (disabled: boolean) => void;
  pickCount?: number;
  groupPickCounts?: Record<string, number>;
  initialPact?: string;
  initialLevel?: number;
}

import { PrerequisiteConfirmationDialog } from "@/lib/components/ui/PrerequisiteConfirmationDialog";
import { checkPrerequisite } from "@/lib/logic/prerequisiteUtils";
import { useNextStepHint } from "@/lib/components/wizard/next-step-hint";
import { buildGroupPickHint, countGroupSelection, findFirstHint } from "@/lib/components/wizard/pick-hint";

const RATING_TOGGLE_DESCRIPTION = "Оцінка варіантів за класовим гайдом RPGbot; найкращі — зверху.";

const displayName = (cls?: ClassI | null) =>
  cls ? classTranslations[cls.name] || classTranslationsEng[cls.name] || cls.name : "Клас";

const ClassChoiceOptionsForm = ({ selectedClass, availableOptions, formId, onNextDisabledChange, pickCount = 1, groupPickCounts, initialPact, initialLevel }: Props) => {
  const { updateFormData, nextStep, formData } = usePersFormStore();

  const [info, setInfo] = useState<ChoiceOptionInfo | null>(null);
  
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<{ groupName: string; optionId: number } | null>(null);
  const [prereqReason, setPrereqReason] = useState<string | undefined>(undefined);

  const { form, onSubmit } = useStepForm(classChoiceOptionsSchema, (data) => {
    updateFormData({ classChoiceSelections: data.classChoiceSelections });
    nextStep();
  });
  
  const watchedSelections = form.watch("classChoiceSelections");
  const selections = useMemo(() => watchedSelections || {}, [watchedSelections]);
  const prevDisabledRef = useRef<boolean | undefined>(undefined);

  const optionsToUse = useMemo(() => {
      if (availableOptions) return availableOptions;
      return (selectedClass?.classChoiceOptions || []).filter((opt) => (opt.levelsGranted || []).includes(1));
  }, [selectedClass, availableOptions]);

  const groupedOptions = useMemo(() => {
    const groups: Record<string, typeof optionsToUse> = {};
    optionsToUse.forEach((opt) => {
      const key = opt.choiceOption.groupName || "Опції";
      if (!groups[key]) groups[key] = [];
      groups[key].push(opt);
    });
    return Object.entries(groups).map(([groupName, options]) => ({ groupName, options }));
  }, [optionsToUse]);

  const ratedOptions = useMemo(() => optionsToUse.map((opt) => opt.choiceOption), [optionsToUse]);
  const ratings = useChoiceOptionRatings(selectedClass, ratedOptions);

  const charPact = useMemo(() => {
    let pact = initialPact;
    Object.values(selections).forEach(selection => {
        const selectedIds = Array.isArray(selection) ? selection : [selection];
        selectedIds.forEach(id => {
            const o = optionsToUse.find(opt => opt.choiceOptionId === id);
            if (o && (
                o.choiceOption.groupName === 'Дар пакту' || 
                (o.choiceOption as any).groupNameEng === 'Pact Boon' ||
                (typeof o.choiceOption.optionNameEng === 'string' && o.choiceOption.optionNameEng.startsWith('Pact of'))
            )) {
                pact = o.choiceOption.optionNameEng;
            }
        });
    });
    return pact;
  }, [initialPact, selections, optionsToUse]);

  const charLevel = useMemo(() => {
     return initialLevel ?? (formData.classId === selectedClass?.classId ? (formData as any).level || 1 : 1);
  }, [initialLevel, formData, selectedClass]);

  useNextStepHint(findFirstHint(groupedOptions.map(({ groupName }) =>
    buildGroupPickHint(groupName, countGroupSelection(selections[groupName]), Math.max(1, Number(groupPickCounts?.[groupName] ?? pickCount) || 1))
  )));

  useEffect(() => {
    let disabled: boolean;

    const hasProvidedOptions = Boolean(availableOptions && availableOptions.length);

    if (!selectedClass && !hasProvidedOptions) {
      disabled = true;
    } else if (!groupedOptions.length) {
      disabled = false;
    } else {
      disabled = groupedOptions.some(({ groupName }) => {
        const required = Math.max(1, Number(groupPickCounts?.[groupName] ?? pickCount) || 1);
        return countGroupSelection(selections[groupName]) < required;
      });
    }

    if (prevDisabledRef.current !== disabled) {
      prevDisabledRef.current = disabled;
      onNextDisabledChange?.(disabled);
    }
  }, [selectedClass, availableOptions, groupedOptions, selections, onNextDisabledChange, pickCount, groupPickCounts]);


  const finalizeSelect = (groupName: string, optionId: number) => {
    const required = Math.max(1, Number(groupPickCounts?.[groupName] ?? pickCount) || 1);
    const current = selections[groupName];
    
    if (required > 1) {
      const currentArray = Array.isArray(current) ? current : (current ? [current as number] : []);
      let nextArray: number[];
      
      if (currentArray.includes(optionId)) {
        nextArray = currentArray.filter(id => id !== optionId);
      } else {
        if (currentArray.length >= required) return;
        nextArray = [...currentArray, optionId];
      }
      
      const nextValue = nextArray.length > 0 ? nextArray : undefined;
      const next: Record<string, number | number[]> = { ...(selections || {}) };
      if (nextValue !== undefined) {
        next[groupName] = nextValue;
      } else {
        delete next[groupName];
      }
      form.setValue("classChoiceSelections", next, { shouldDirty: true });
    } else {
      // Single selection: toggle on/off
      if (current === optionId) {
        // Deselect - remove this selection
        const next: Record<string, number | number[]> = { ...(selections || {}) };
        delete next[groupName];
        form.setValue("classChoiceSelections", next, { shouldDirty: true });
        return;
      }
      
      // Select new option
      const next: Record<string, number | number[]> = { ...(selections || {}), [groupName]: optionId };

      const base = groupName.replace(/\s+#\d+$/, "");
      for (const key of Object.keys(next)) {
        if (key === groupName) continue;
        const keyBase = key.replace(/\s+#\d+$/, "");
        if (keyBase !== base) continue;
        if (next[key] === optionId && key !== groupName) {
          delete next[key];
        }
      }
      form.setValue("classChoiceSelections", next, { shouldDirty: true });
    }
  };

  const selectOption = (groupName: string, optionId: number, options: typeof optionsToUse) => {
    const opt = options.find(o => o.choiceOptionId === optionId);
    if (!opt) return;

    const required = Math.max(1, Number(groupPickCounts?.[groupName] ?? pickCount) || 1);

    // Check if already selected (for unselecting)
    const current = selections[groupName];
    const isAlreadySelected = required > 1 
      ? Array.isArray(current) && current.includes(optionId)
      : current === optionId;

    if (isAlreadySelected) {
      finalizeSelect(groupName, optionId);
      return;
    }

    // Check prerequisites
    const prereqResult = checkPrerequisite(opt.choiceOption.prerequisites, {
       classLevel: charLevel,
       pact: charPact,
       existingChoiceOptionIds: Object.values(selections).flat().filter(id => typeof id === 'number') as number[]
    });

    if (!prereqResult.met) {
       setPrereqReason(prereqResult.reason);
       setPendingSelection({ groupName, optionId });
       setConfirmOpen(true);
    } else {
       finalizeSelect(groupName, optionId);
    }
  };

  if (!selectedClass && !availableOptions) {
    return (
      <Card className="p-4 text-center text-slate-200">
        Спершу оберіть клас.
      </Card>
    );
  }

  if (!groupedOptions.length) {
    return (
      <Card className="p-4 text-center text-slate-200">
        На {charLevel} рівні {displayName(selectedClass)} не має окремих виборів. Можна рухатися далі.
      </Card>
    );
  }

  return (
    <form id={formId} onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1 text-center">
        <p className="text-sm font-semibold text-slate-300">Рівень {charLevel}</p>
        <h2 className="font-rpg-display text-3xl font-semibold uppercase tracking-widest text-slate-200 sm:text-4xl">Опції класу</h2>
        <p className="text-sm text-slate-400">
          {displayName(selectedClass)} пропонує вибір. Оберіть те, що підходить вашому персонажу.
        </p>
      </div>

      {ratings.isAvailable ? <RpgbotRecommendationToggle isOn={ratings.isOn} onChange={ratings.setIsOn} description={RATING_TOGGLE_DESCRIPTION} /> : null}

      <ClassChoiceOptionGroups
        groupedOptions={groupedOptions}
        selectionState={{ charLevel, charPact, groupPickCounts, pickCount, selections }}
        onSelectOption={selectOption}
        onShowFeatures={(title, features, rating) => setInfo({ title, features, rating })}
        findRating={ratings.findRating}
      />

      <ChoiceOptionFeaturesDialog info={info} onClose={() => setInfo(null)} />

      <PrerequisiteConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        reason={prereqReason}
        onConfirm={() => {
          if (pendingSelection) {
            finalizeSelect(pendingSelection.groupName, pendingSelection.optionId);
          }
        }}
      />
    </form>
  );
};

export default ClassChoiceOptionsForm;
