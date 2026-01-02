"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SubclassI } from "@/lib/types/model-types";
import { useStepForm } from "@/hooks/useStepForm";
import { subclassSchema } from "@/lib/zod/schemas/persCreateSchema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ControlledInfoDialog, InfoSectionTitle } from "@/lib/components/characterCreator/EntityInfoDialog";
import clsx from "clsx";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { FormattedDescription } from "@/components/ui/FormattedDescription";

interface Props {
  selectedSubclass?: SubclassI | null;
  availableOptions?: SubclassI["subclassChoiceOptions"];
  formId: string;
  onNextDisabledChange?: (disabled: boolean) => void;
  pickCount?: number; // Added pickCount prop
}

const previewTextFromFeatures = (
  features?: SubclassI["subclassChoiceOptions"][number]["choiceOption"]["features"]
) => {
  const stripMarkdownPreview = (value: string) => {
    return value
      .replace(/\r\n/g, "\n")
      .replace(/<a\s+[^>]*>(.*?)<\/a>/gi, "$1")
      .replace(/<[^>]+>/g, " ")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
      .replace(/`{1,3}([^`]+)`{1,3}/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^>\s?/gm, "")
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/^\s*\d+\.\s+/gm, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const list = (features || []).map((x) => x.feature).filter(Boolean) as any[];
  const first = list.find((f) => (f.shortDescription || f.description) && String(f.shortDescription || f.description).trim());
  if (!first) return "";
  return stripMarkdownPreview(String(first.shortDescription || first.description));
};

const SubclassChoiceOptionsForm = ({ selectedSubclass, availableOptions, formId, onNextDisabledChange, pickCount = 1 }: Props) => {
  const { updateFormData, nextStep } = usePersFormStore();

  const [infoOpen, setInfoOpen] = useState(false);
  const [infoTitle, setInfoTitle] = useState<string>("");
  const [infoFeatures, setInfoFeatures] = useState<Array<{ name: string; description: string; shortDescription?: string | null }>>([]);
  
  const { form, onSubmit } = useStepForm(subclassSchema, (data) => {
    updateFormData({ subclassChoiceSelections: data.subclassChoiceSelections });
    nextStep();
  });
  
  const selections = (form.watch("subclassChoiceSelections") || {}) as Record<string, number | number[]>;
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
        const selected = selections[groupName];
        if (Array.isArray(selected)) {
          return selected.length === pickCount;
        }
        return selected !== undefined;
      });
      disabled = !allGroupsSelected;
    }

    if (prevDisabledRef.current !== disabled) {
      onNextDisabledChange?.(disabled);
      prevDisabledRef.current = disabled;
    }
  }, [groupedOptions, selections, onNextDisabledChange, pickCount]);


  const selectOption = (groupName: string, optionId: number) => {
    const current = selections[groupName];
    
    if (pickCount > 1) {
      // Multi-select logic
      const currentArray = Array.isArray(current) ? current : (current ? [current as number] : []);
      let nextArray: number[];
      
      if (currentArray.includes(optionId)) {
        nextArray = currentArray.filter(id => id !== optionId);
      } else {
        if (currentArray.length >= pickCount) {
          // If we are at the limit, we could either do nothing or replace the last one.
          // Let's do nothing (user must unselect first) or we could auto-replace if pickCount is 1.
          // But here pickCount > 1, so the user should actively manage their picks.
          return; 
        }
        nextArray = [...currentArray, optionId];
      }
      
      const next = { ...(selections || {}), [groupName]: nextArray };
      form.setValue("subclassChoiceSelections", next, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    } else {
      // Single-select logic (original)
      const next = { ...(selections || {}), [groupName]: optionId };
      form.setValue("subclassChoiceSelections", next, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    }
  };

  const openFeaturesInfo = (
    title: string,
    features?: SubclassI["subclassChoiceOptions"][number]["choiceOption"]["features"]
  ) => {
    const normalized = (features || [])
      .map((item) => item.feature)
      .filter(Boolean)
      .map((feat) => ({
        name: String((feat as any).name ?? ""),
        description: String((feat as any).description ?? ""),
        shortDescription: (feat as any).shortDescription ?? null,
      }))
      .filter((f) => f.name.trim() || f.description.trim() || (f.shortDescription ?? "").toString().trim());

    setInfoTitle(title);
    setInfoFeatures(normalized);
    setInfoOpen(true);
  };

  if (groupedOptions.length === 0) {
    return <div className="text-center text-muted-foreground py-4">Немає доступних опцій для вибору на цьому рівні.</div>;
  }

  return (
    <form id={formId} onSubmit={onSubmit} className="space-y-6">
      {groupedOptions.map(({ groupName, options }) => (
        <div key={groupName} className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <InfoSectionTitle>{groupName}</InfoSectionTitle>
            {pickCount > 1 && (
              <Badge variant="outline" className="border-white/15 bg-white/5 text-slate-200">
                Обрано: {(selections[groupName] as number[] | undefined)?.length || 0}/{pickCount}
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3">
            {options.map((opt) => {
              const preview = previewTextFromFeatures(opt.choiceOption.features);

              return (
                <Card
                  key={opt.choiceOption.choiceOptionId}
                  className={clsx(
                    "glass-card cursor-pointer transition-all duration-200",
                    pickCount > 1 
                      ? (Array.isArray(selections[groupName]) && (selections[groupName] as number[]).includes(opt.choiceOption.choiceOptionId))
                        ? "glass-active"
                        : (Array.isArray(selections[groupName]) && (selections[groupName] as number[]).length >= pickCount) && "opacity-50 grayscale-[0.5]"
                      : (selections[groupName] === opt.choiceOption.choiceOptionId) && "glass-active"
                  )}
                  onClick={(e) => {
                    if ((e.target as HTMLElement | null)?.closest?.('[data-stop-card-click]')) return;
                    selectOption(groupName, opt.choiceOption.choiceOptionId)
                  }}
                >
                  <CardContent className="relative flex items-start justify-between gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-lg font-semibold text-white">
                            {opt.choiceOption.optionName}
                          </div>
                          {preview && (
                            <div className="mt-1 line-clamp-2 text-sm text-slate-300">
                              {preview}
                            </div>
                          )}
                        </div>

                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-slate-300 hover:text-white"
                          data-stop-card-click
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openFeaturesInfo(opt.choiceOption.optionName, opt.choiceOption.features);
                          }}
                          aria-label={`Деталі: ${opt.choiceOption.optionName}`}
                        >
                          <HelpCircle className="h-5 w-5" />
                        </Button>
                      </div>

                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      <ControlledInfoDialog
        open={infoOpen}
        onOpenChange={setInfoOpen}
        title={infoTitle}
      >
        <div className="space-y-4">
          {infoFeatures.length === 0 ? (
            <p className="text-sm text-slate-300">Немає деталей для показу.</p>
          ) : (
            infoFeatures.map((f) => (
              <div key={f.name} className="glass-panel rounded-xl border border-slate-800/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{f.name}</p>
                </div>
                {f.description && (
                  <FormattedDescription
                    content={f.description}
                    className="mt-2 text-slate-200/90"
                  />
                )}
              </div>
            ))
          )}
        </div>
      </ControlledInfoDialog>
    </form>
  );
};

export default SubclassChoiceOptionsForm;
