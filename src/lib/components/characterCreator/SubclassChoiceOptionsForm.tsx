"use client";

import { useEffect, useMemo, useRef } from "react";
import { SubclassI } from "@/lib/types/model-types";
import { useStepForm } from "@/hooks/useStepForm";
import { subclassSchema } from "@/lib/zod/schemas/persCreateSchema";
import { Card, CardContent } from "@/lib/components/ui/card";
import { Badge } from "@/lib/components/ui/badge";
// import { Button } from "@/lib/components/ui/Button";
import { InfoSectionTitle } from "@/lib/components/characterCreator/EntityInfoDialog";
import clsx from "clsx";
import { usePersFormStore } from "@/lib/stores/persFormStore";

interface Props {
  selectedSubclass?: SubclassI | null;
  availableOptions?: SubclassI["subclassChoiceOptions"];
  formId: string;
  onNextDisabledChange?: (disabled: boolean) => void;
}

const formatFeatures = (features?: SubclassI["subclassChoiceOptions"][number]["choiceOption"]["features"]) =>
  (features || []).map((item) => item.feature?.name).filter(Boolean);

const SubclassChoiceOptionsForm = ({ selectedSubclass, availableOptions, formId, onNextDisabledChange }: Props) => {
  const { updateFormData, nextStep } = usePersFormStore();
  
  const { form, onSubmit } = useStepForm(subclassSchema, (data) => {
    updateFormData({ subclassChoiceSelections: data.subclassChoiceSelections });
    nextStep();
  });
  
  const selections = form.watch("subclassChoiceSelections") || {};
  const prevDisabledRef = useRef<boolean | undefined>(undefined);

  const optionsToUse = useMemo(() => {
      if (availableOptions) return availableOptions;
      // Default to level 1 if not specified (though subclasses usually start at 1, 2, or 3)
      // For creation flow, we might need to check the class's subclass level, but usually this form is shown when subclass is active.
      // Let's assume for creation flow we show all options granted at the subclass level?
      // Or maybe we just show all options?
      // In creation flow, we usually pick subclass at level 1, 2 or 3.
      // If we are at that level, we should show options for that level.
      // But `levelsGranted` might be higher.
      // For now, let's filter for level 1 as a default fallback, or just return all if we assume the parent filters.
      // Actually, let's stick to the pattern:
      return (selectedSubclass?.subclassChoiceOptions || []).filter((opt) => (opt.levelsGranted || []).includes(1));
  }, [selectedSubclass, availableOptions]);

  const groupedOptions = useMemo(() => {
    const groups: Record<string, typeof optionsToUse> = {};
    optionsToUse.forEach((opt) => {
      const key = opt.choiceOption.groupName || "Опції";
      if (!groups[key]) groups[key] = [];
      groups[key].push(opt);
    });
    return Object.entries(groups).map(([groupName, options]) => ({ groupName, options }));
  }, [optionsToUse]);

  useEffect(() => {
    let disabled: boolean;

    if (groupedOptions.length === 0) {
      disabled = false;
    } else {
      const allGroupsSelected = groupedOptions.every(({ groupName }) => {
        const selectedOptionId = selections[groupName];
        return selectedOptionId !== undefined;
      });
      disabled = !allGroupsSelected;
    }

    if (prevDisabledRef.current !== disabled) {
      onNextDisabledChange?.(disabled);
      prevDisabledRef.current = disabled;
    }
  }, [groupedOptions, selections, onNextDisabledChange]);

  const handleSelect = (groupName: string, optionId: number) => {
    const newSelections = { ...selections, [groupName]: optionId };
    form.setValue("subclassChoiceSelections", newSelections);
    updateFormData({ subclassChoiceSelections: newSelections });
  };

  if (groupedOptions.length === 0) {
    return <div className="text-center text-muted-foreground py-4">Немає доступних опцій для вибору на цьому рівні.</div>;
  }

  return (
    <form id={formId} onSubmit={onSubmit} className="space-y-6">
      {groupedOptions.map(({ groupName, options }) => (
        <div key={groupName} className="space-y-3">
          <InfoSectionTitle>{groupName}</InfoSectionTitle>
          <div className="grid grid-cols-1 gap-3">
            {options.map((opt) => {
              const isSelected = selections[groupName] === opt.choiceOption.choiceOptionId;
              const features = formatFeatures(opt.choiceOption.features);

              return (
                <Card
                  key={opt.choiceOption.choiceOptionId}
                  className={clsx(
                    "cursor-pointer transition-all hover:border-primary/50",
                    isSelected ? "border-primary bg-primary/5" : "border-border"
                  )}
                  onClick={() => handleSelect(groupName, opt.choiceOption.choiceOptionId)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-lg">{opt.choiceOption.optionName}</div>
                      {features.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {features.map((f, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {f}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className={clsx(
                        "w-5 h-5 rounded-full border flex items-center justify-center",
                        isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"
                    )}>
                        {isSelected && <div className="w-2.5 h-2.5 bg-current rounded-full" />}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </form>
  );
};

export default SubclassChoiceOptionsForm;
