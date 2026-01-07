"use client";

import { useEffect, useMemo } from "react";
import clsx from "clsx";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { usePersFormStore } from "@/lib/stores/persFormStore";
import { classTranslations, classTranslationsEng } from "@/lib/refs/translation";
import { InfoSectionTitle } from "@/lib/components/characterCreator/EntityInfoDialog";
import { ClassI, SubclassI } from "@/lib/types/model-types";
import ChoiceReplacementForm from "@/lib/components/levelUp/ChoiceReplacementForm";

interface Props {
  selectedClass?: ClassI | null;
  effectiveSubclass?: SubclassI | null;
  persChoiceOptions?: Array<any>;
  classLevel: number;
  formId: string;
  onNextDisabledChange?: (disabled: boolean) => void;
  mode?: "OPTIONAL" | "REPLACEMENT";
}

const displayName = (cls?: ClassI | null) =>
  cls ? classTranslations[cls.name] || classTranslationsEng[cls.name] || cls.name : "Клас";

export default function OptionalFeaturesForm({
  selectedClass,
  effectiveSubclass,
  persChoiceOptions,
  classLevel,
  formId,
  onNextDisabledChange,
  mode,
}: Props) {
  const { formData, updateFormData } = usePersFormStore();

  const decisions = (formData.classOptionalFeatureSelections as Record<string, boolean>) || {};

  const replacementSelections =
    (formData as any).classOptionalFeatureReplacementSelections as
      | Record<string, { removeChoiceOptionId?: number; addChoiceOptionId?: number }>
      | undefined;

  const setReplacement = (optionalFeatureId: number, patch: { removeChoiceOptionId?: number; addChoiceOptionId?: number }) => {
    const key = String(optionalFeatureId);
    const next = {
      ...(replacementSelections || {}),
      [key]: {
        ...(replacementSelections?.[key] || {}),
        ...patch,
      },
    };
    updateFormData({ ...(formData as any), classOptionalFeatureReplacementSelections: next } as any);
  };

  const selectedChoiceIds = useMemo(() => {
    const ids = new Set<number>();

    const selections = (formData.classChoiceSelections as Record<string, number | number[]>) || {};
    for (const value of Object.values(selections)) {
      const arr = Array.isArray(value) ? value : [value];
      for (const v of arr) {
        const n = Number(v);
        if (Number.isFinite(n)) ids.add(n);
      }
    }

    for (const co of (persChoiceOptions || []) as any[]) {
      const n = Number(co?.choiceOptionId);
      if (Number.isFinite(n)) ids.add(n);
    }

    return Array.from(ids);
  }, [formData.classChoiceSelections, persChoiceOptions]);

  const optionalAtLevel = useMemo(() => {
    return (selectedClass?.classOptionalFeatures || [])
      .filter((item) => (item.grantedOnLevels || []).includes(classLevel))
      .filter((item) => Boolean(item.optionalFeatureId));
  }, [selectedClass, classLevel]);

  const isReplacement = (item: any) => {
    return Boolean(
      item?.replacesInvocation ||
        item?.replacesFightingStyle ||
        item?.replacesManeuver ||
        (Array.isArray(item?.replacesFeatures) && item.replacesFeatures.length > 0)
    );
  };

  const visibleOptional = useMemo(() => {
    return optionalAtLevel
      .filter((item) => {
        const deps = (item as any).appearsOnlyIfChoicesTaken || [];
        if (!deps.length) return true;
        return deps.some((choice: any) => selectedChoiceIds.includes(choice.choiceOptionId));
      })
      .filter((item) => {
        if (mode === "REPLACEMENT") return isReplacement(item);
        if (mode === "OPTIONAL") return !isReplacement(item);
        return true;
      })
      .filter((item) => {
        // Features that are only gated by previously-taken choices (like Deft Explorer follow-ups)
        // are treated as auto-granted, not something the user should accept/decline again.
        if (mode === "OPTIONAL") {
          const deps = (item as any)?.appearsOnlyIfChoicesTaken || [];
          const autoGrantedConditional = !isReplacement(item) && Boolean(item?.featureId) && Array.isArray(deps) && deps.length > 0;
          if (autoGrantedConditional) return false;
        }
        return true;
      })
      .filter((item) => Boolean(item.optionalFeatureId));
  }, [optionalAtLevel, selectedChoiceIds, mode]);

  const selectedPact = useMemo(() => {
    // Pact boon is stored as a ChoiceOption (e.g. Pact of the Blade)
    const fromPers = (persChoiceOptions || []).find(
      (co: any) => typeof co?.optionNameEng === "string" && co.optionNameEng.startsWith("Pact of")
    );
    return fromPers?.optionNameEng ? String(fromPers.optionNameEng) : undefined;
  }, [persChoiceOptions]);

  useEffect(() => {
    if (!selectedClass) {
      onNextDisabledChange?.(true);
      return;
    }
    if (!visibleOptional.length) {
      onNextDisabledChange?.(false);
      return;
    }

    const incomplete = visibleOptional.some((item: any) => {
      const id = item.optionalFeatureId;
      if (!id) return false;

      const decision = decisions[String(id)];
      if (decision === undefined) return true;
      if (decision !== true) return false;

      const needsSwap = Boolean(item.replacesInvocation || item.replacesFightingStyle || item.replacesManeuver);
      if (!needsSwap) return false;

      const sel = replacementSelections?.[String(id)];
      const removeId = Number(sel?.removeChoiceOptionId);
      const addId = Number(sel?.addChoiceOptionId);
      if (!Number.isFinite(removeId) || !Number.isFinite(addId)) return true;
      if (removeId === addId) return true;
      return false;
    });
    onNextDisabledChange?.(incomplete);
  }, [selectedClass, visibleOptional, decisions, replacementSelections, onNextDisabledChange]);

  const setDecision = (id: number, take: boolean) => {
    const next = { ...(decisions || {}), [id]: take };
    updateFormData({ classOptionalFeatureSelections: next });
  };

  if (!selectedClass) {
    return (
      <Card className="glass-card p-4 text-center text-slate-200">
        Спершу оберіть клас.
      </Card>
    );
  }

  if (!visibleOptional.length) {
    const noun = mode === "REPLACEMENT" ? "замін" : mode === "OPTIONAL" ? "опціональних фіч" : "опцій";
    return (
      <Card className="glass-card p-4 text-center text-slate-200">
        На рівні {classLevel} {displayName(selectedClass)} не пропонує {noun}. Можна продовжувати.
      </Card>
    );
  }

  const heading = mode === "REPLACEMENT" ? "Заміни" : mode === "OPTIONAL" ? "Опціональні фічі" : "Додаткові опції класу";
  const subheading =
    mode === "REPLACEMENT"
      ? "За бажанням можна замінити деякі вміння (стилі бою, маневри тощо) на альтернативні."
      : mode === "OPTIONAL"
        ? "За бажанням можна взяти додаткові фічі класу."
        : "За бажанням можна замінити деякі вміння (стилі бою, маневри тощо) на альтернативні.";

  return (
    <form id={formId} className="space-y-4">
      <div className="space-y-1 text-center">
        <p className="text-sm font-semibold text-slate-300">Рівень {classLevel}</p>
        <h2 className="font-rpg-display text-3xl font-semibold uppercase tracking-widest text-slate-200 sm:text-4xl">
          {heading}
        </h2>
        <p className="text-sm text-slate-400">
          {subheading}
        </p>
      </div>

      <div className="space-y-3">
        {visibleOptional.map((item) => {
          if (!item.optionalFeatureId) return null;

          const key = item.optionalFeatureId.toString();
          const accepted = decisions[key];
          const title = item.title || item.feature?.name || "Додаткова опція";
          const description = item.feature?.description || "Деталі відсутні.";
          const replaces =
            item.replacesFeatures
              ?.map((rep) => rep.replacedFeature?.name)
              .filter(Boolean)
              .join(", ") || "";

          const needsSwap = Boolean(item.replacesInvocation || item.replacesFightingStyle || item.replacesManeuver);
          const groupName = item.replacesInvocation
            ? "Потойбічні виклики"
            : item.replacesFightingStyle
              ? "Бойовий стиль"
              : item.replacesManeuver
                ? "Маневри майстра бою"
                : undefined;

          const currentChoices = (persChoiceOptions || []).filter((co: any) => String(co?.groupName || "") === groupName);
          const availableClassOptions = Object.values((selectedClass as any)?.classChoiceOptions || {});
          const availableSubclassOptions = Object.values((effectiveSubclass as any)?.subclassChoiceOptions || {});
          const availableOptions = [...availableClassOptions, ...availableSubclassOptions];

          return (
            <Card
              key={key}
              className={clsx(
                "glass-card",
                accepted === true && "border-gradient-rpg border-gradient-rpg-active glass-active",
                accepted === false && "opacity-90"
              )}
            >
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    {replaces ? (
                      <p className="text-xs text-slate-400">Замінює: {replaces}</p>
                    ) : null}
                  </div>
                  <Badge variant="outline" className="border-white/15 bg-white/5 text-slate-200">
                    Рівень {classLevel}
                  </Badge>
                </div>

                <div className="glass-panel border-gradient-rpg space-y-1.5 rounded-lg p-3">
                  <InfoSectionTitle>Опис</InfoSectionTitle>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200/90">
                    {description}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={clsx(
                      "border-white/15 bg-white/5 text-slate-200 hover:bg-white/7 hover:text-white",
                      accepted === true &&
                        "border-gradient-rpg border-gradient-rpg-active glass-active text-slate-100"
                    )}
                    onClick={() => setDecision(item.optionalFeatureId!, true)}
                  >
                    {mode === "OPTIONAL" ? "Взяти" : "Прийняти заміну"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={clsx(
                      "border-white/15 bg-white/5 text-slate-200 hover:bg-white/7 hover:text-white",
                      accepted === false && "border-rose-400/40 bg-rose-500/10 text-rose-50"
                    )}
                    onClick={() => setDecision(item.optionalFeatureId!, false)}
                  >
                    {mode === "OPTIONAL" ? "Пропустити" : "Залишити як є"}
                  </Button>
                </div>

                {needsSwap && accepted === true && groupName ? (
                  <div className="glass-panel border-gradient-rpg rounded-lg p-3">
                    <ChoiceReplacementForm
                      title={title}
                      groupName={groupName}
                      currentChoices={currentChoices}
                      availableOptions={availableOptions as any[]}
                      classLevel={classLevel}
                      pact={selectedPact}
                      formId={`${formId}-replacement-${key}`}
                      onSelectionChange={(replacement) => {
                        if (!replacement) {
                          setReplacement(item.optionalFeatureId!, {
                            removeChoiceOptionId: undefined,
                            addChoiceOptionId: undefined,
                          });
                          return;
                        }
                        setReplacement(item.optionalFeatureId!, {
                          removeChoiceOptionId: replacement.oldId,
                          addChoiceOptionId: replacement.newId,
                        });
                      }}
                    />
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </form>
  );
}
