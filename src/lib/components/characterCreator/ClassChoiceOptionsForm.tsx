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
}

const displayName = (cls?: ClassI | null) =>
  cls ? classTranslations[cls.name] || classTranslationsEng[cls.name] || cls.name : "Клас";

const isEnumLike = (value?: string | null) => !!value && /^[A-Z0-9_]+$/.test(value);

const ClassChoiceOptionsForm = ({ selectedClass, availableOptions, formId, onNextDisabledChange }: Props) => {
  const { updateFormData, nextStep } = usePersFormStore();

  const [infoOpen, setInfoOpen] = useState(false);
  const [infoTitle, setInfoTitle] = useState<string>("");
  const [infoFeatures, setInfoFeatures] = useState<Array<{ name: string; description: string; shortDescription?: string | null }>>([]);
  
  const { form, onSubmit } = useStepForm(classChoiceOptionsSchema, (data) => {
    updateFormData({ classChoiceSelections: data.classChoiceSelections });
    nextStep();
  });
  
  const selections = form.watch("classChoiceSelections") || {};
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

  useEffect(() => {
    let disabled: boolean;

    if (!selectedClass) {
      disabled = true;
    } else if (!groupedOptions.length) {
      disabled = false;
    } else {
      disabled = groupedOptions.some(({ groupName }) => !selections[groupName]);
    }

    if (prevDisabledRef.current !== disabled) {
      prevDisabledRef.current = disabled;
      onNextDisabledChange?.(disabled);
    }
  }, [selectedClass, groupedOptions, selections, onNextDisabledChange]);

  useEffect(() => {
    updateFormData({ classChoiceSelections: selections });
  }, [selections, updateFormData]);

  const selectOption = (groupName: string, optionId: number) => {
    const next = { ...(selections || {}), [groupName]: optionId };
    form.setValue("classChoiceSelections", next, { shouldDirty: true });
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
                  Оберіть 1
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {options.map((opt) => {
                  const optionId = opt.optionId ?? opt.choiceOptionId;
                  const selected = selections[groupName] === optionId;
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

                  return (
                    <Card
                      key={optionId}
                      className={clsx(
                        "glass-card cursor-pointer transition-all duration-200",
                        selected ? "glass-active" : ""
                      )}
                      onClick={() => selectOption(groupName, optionId)}
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

                            <Badge
                              variant={selected ? "secondary" : "outline"}
                              className={clsx(
                                "border-white/15 bg-white/5 text-slate-200",
                                selected && "text-slate-100"
                              )}
                            >
                              {selected ? "Обрано" : "Обрати"}
                            </Badge>
                          </div>
                        </div>

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
        subtitle={infoFeatures.length ? `Фіч: ${infoFeatures.length}` : undefined}
        contentClassName="max-w-2xl border border-white/10 bg-slate-900/95 backdrop-blur text-slate-50"
      >
        {infoFeatures.length ? (
          <div className="space-y-3">
            <InfoSectionTitle>Фічі</InfoSectionTitle>
            <div className="space-y-3">
              {infoFeatures.map((feat) => (
                <div key={feat.name} className="rounded-lg border border-white/10 bg-white/5 p-3">
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
    </form>
  );
};

export default ClassChoiceOptionsForm;
