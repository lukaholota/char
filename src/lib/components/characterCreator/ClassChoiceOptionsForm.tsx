"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ClassI } from "@/lib/types/model-types";
import { useStepForm } from "@/hooks/useStepForm";
import { classChoiceOptionsSchema } from "@/lib/zod/schemas/persCreateSchema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { classTranslations, classTranslationsEng } from "@/lib/refs/translation";
import { translateValue } from "@/lib/components/characterCreator/infoUtils";
import clsx from "clsx";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { ControlledInfoDialog, InfoSectionTitle } from "@/lib/components/characterCreator/EntityInfoDialog";
import { FormattedDescription } from "@/components/ui/FormattedDescription";

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

interface Props {
  selectedClass?: ClassI | null;
  availableOptions?: ClassI["classChoiceOptions"];
  formId: string;
  onNextDisabledChange?: (disabled: boolean) => void;
  pickCount?: number;
  initialPact?: string;
  initialLevel?: number;
}

import { PrerequisiteConfirmationDialog } from "@/lib/components/ui/PrerequisiteConfirmationDialog";
import { checkPrerequisite } from "@/lib/logic/prerequisiteUtils";

const displayName = (cls?: ClassI | null) =>
  cls ? classTranslations[cls.name] || classTranslationsEng[cls.name] || cls.name : "Клас";

const isEnumLike = (value?: string | null) => !!value && /^[A-Z0-9_]+$/.test(value);

const ClassChoiceOptionsForm = ({ selectedClass, availableOptions, formId, onNextDisabledChange, pickCount = 1, initialPact, initialLevel }: Props) => {
  const { updateFormData, nextStep, formData } = usePersFormStore();

  const [infoOpen, setInfoOpen] = useState(false);
  const [infoTitle, setInfoTitle] = useState<string>("");
  const [infoFeatures, setInfoFeatures] = useState<Array<{ name: string; description: string; shortDescription?: string | null }>>([]);
  
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

  const charPact = useMemo(() => {
    let pact = initialPact;
    Object.values(selections).forEach(selection => {
        const selectedIds = Array.isArray(selection) ? selection : [selection];
        selectedIds.forEach(id => {
            const o = optionsToUse.find(opt => (opt.optionId ?? opt.choiceOptionId) === id);
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

  useEffect(() => {
    let disabled: boolean;

    const hasProvidedOptions = Boolean(availableOptions && availableOptions.length);

    if (!selectedClass && !hasProvidedOptions) {
      disabled = true;
    } else if (!groupedOptions.length) {
      disabled = false;
    } else {
      disabled = groupedOptions.some(({ groupName }) => {
        const selected = selections[groupName];
        if (Array.isArray(selected)) {
          return selected.length < pickCount;
        }
        return !selected;
      });
    }

    if (prevDisabledRef.current !== disabled) {
      prevDisabledRef.current = disabled;
      onNextDisabledChange?.(disabled);
    }
  }, [selectedClass, availableOptions, groupedOptions, selections, onNextDisabledChange, pickCount]);

  useEffect(() => {
    updateFormData({ classChoiceSelections: selections });
  }, [selections, updateFormData]);

  const finalizeSelect = (groupName: string, optionId: number) => {
    const current = selections[groupName];
    
    if (pickCount > 1) {
      const currentArray = Array.isArray(current) ? current : (current ? [current as number] : []);
      let nextArray: number[];
      
      if (currentArray.includes(optionId)) {
        nextArray = currentArray.filter(id => id !== optionId);
      } else {
        if (currentArray.length >= pickCount) return;
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
    const opt = options.find(o => (o.optionId ?? o.choiceOptionId) === optionId);
    if (!opt) return;

    // Check if already selected (for unselecting)
    const current = selections[groupName];
    const isAlreadySelected = pickCount > 1 
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

  const openFeaturesInfo = (
    title: string,
    features?: ClassI["classChoiceOptions"][number]["choiceOption"]["features"]
  ) => {
    const normalized = (features || [])
      .map((item) => item.feature)
      .filter(Boolean)
      .map((feat) => ({
        name: String((feat as any).name ?? ""),
        description: String((feat as any).description ?? ""),
        shortDescription: (feat as any).shortDescription ?? null,
      }))
      .filter((feat) => feat.name);

    setInfoTitle(title);
    setInfoFeatures(normalized);
    setInfoOpen(true);
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
        На 1 рівні {displayName(selectedClass)} не має окремих виборів. Можна рухатися далі.
      </Card>
    );
  }

  return (
    <form id={formId} onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1 text-center">
        <p className="text-sm font-semibold text-slate-300">Рівень 1</p>
        <h2 className="font-rpg-display text-3xl font-semibold uppercase tracking-widest text-slate-200 sm:text-4xl">Опції класу</h2>
        <p className="text-sm text-slate-400">
          {displayName(selectedClass)} пропонує вибір. Оберіть те, що підходить вашому персонажу.
        </p>
      </div>

      <div className="space-y-4">
        {groupedOptions.map(({ groupName, options }) => (
          <Card
            key={groupName}
            className=""
          >
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Група</p>
                  <p className="text-base font-semibold text-white">{groupName}</p>
                </div>
                <Badge variant="outline" className="border-white/15 bg-white/5 text-slate-200">
                  Обрано: {Array.isArray(selections[groupName]) ? (selections[groupName] as number[]).length : (selections[groupName] ? 1 : 0)}/{pickCount}
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {options.map((opt) => {
                  const optionId = opt.optionId ?? opt.choiceOptionId;
                  const ukrLabel = opt.choiceOption.optionName;
                  const engLabel = opt.choiceOption.optionNameEng;
                  const label = ukrLabel || (isEnumLike(engLabel) ? translateValue(engLabel) : engLabel);

                  const featureObjects = (opt.choiceOption.features || [])
                    .map((item) => item.feature)
                    .filter(Boolean) as Array<{ shortDescription?: string | null; description?: string | null }>;

                  const previewText =
                    featureObjects.find((f) => (f.shortDescription ?? "").trim())?.shortDescription ||
                    featureObjects.find((f) => (f.description ?? "").trim())?.description ||
                    "";

                  const prereqResult = checkPrerequisite(opt.choiceOption.prerequisites, {
                    classLevel: charLevel,
                    pact: charPact,
                    existingChoiceOptionIds: Object.values(selections).flat().filter(id => typeof id === 'number') as number[]
                  });

                  return (
                    <Card
                      key={optionId}
                      className={clsx(
                        "glass-card cursor-pointer transition-all duration-200",
                        pickCount > 1 
                          ? (Array.isArray(selections[groupName]) && (selections[groupName] as number[]).includes(optionId))
                            ? "glass-active"
                            : (Array.isArray(selections[groupName]) && (selections[groupName] as number[]).length >= pickCount) && "opacity-50 grayscale-[0.5]"
                          : (selections[groupName] === optionId) && "glass-active"
                      )}
                      onClick={(e) => {
                        if ((e.target as HTMLElement | null)?.closest?.('[data-stop-card-click]')) return;
                        selectOption(groupName, optionId, options)
                      }}
                    >
                      <CardContent className="flex h-full flex-col gap-2 p-3 sm:p-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-white">{label}</p>

                          <div className="flex items-center gap-2">
                            <div
                              onPointerDown={(e) => {
                                e.stopPropagation();
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              <Button
                                type="button"
                                size="icon"
                                variant="secondary"
                                className="glass-panel border-gradient-rpg h-8 w-8 rounded-full text-slate-100 transition-all duration-200 hover:text-white focus-visible:ring-cyan-400/30"
                                aria-label={`Інформація про ${label}`}
                                // Використовуємо ControlledInfoDialog з EntityInfoDialog.tsx для модалки з деталями фіч.
                                onClick={() => openFeaturesInfo(label || "Опція", opt.choiceOption.features)}
                              >
                                <HelpCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {!prereqResult.met && (prereqResult.reasons?.length || prereqResult.reason) && (
                          <div className="bg-rose-500/10 border border-rose-500/20 rounded px-2 py-1 text-[11px] font-medium text-rose-400 space-y-0.5">
                            {prereqResult.reasons ? (
                              prereqResult.reasons.map((r, i) => (
                                <div key={i}>{r}</div>
                              ))
                            ) : (
                              <div>{prereqResult.reason}</div>
                            )}
                          </div>
                        )}

                        {previewText ? (
                          <p className="text-sm text-slate-400 line-clamp-2">
                            {stripMarkdownPreview(String(previewText))}
                          </p>
                        ) : null}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ControlledInfoDialog
        open={infoOpen}
        onOpenChange={setInfoOpen}
        title={infoTitle || "Фічі"}
        contentClassName="max-w-2xl"
      >
        {infoFeatures.length ? (
          <div className="space-y-3">
            <InfoSectionTitle>Фічі</InfoSectionTitle>
            <div className="space-y-3">
              {infoFeatures.map((feat) => (
                <div key={feat.name} className="glass-panel rounded-xl border border-slate-800/70 p-4">
                  <div className="text-sm font-semibold text-white">{feat.name}</div>
                  {feat.description ? (
                    <FormattedDescription
                      content={feat.description}
                      className="mt-2 text-slate-200/90"
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-400">Немає фіч</div>
        )}
      </ControlledInfoDialog>

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
