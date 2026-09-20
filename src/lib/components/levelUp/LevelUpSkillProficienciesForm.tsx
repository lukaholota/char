"use client";

import { useEffect, useMemo } from "react";
import clsx from "clsx";
import { Lock } from "lucide-react";
import { useStepForm } from "@/hooks/useStepForm";
import { levelUpSkillProficienciesSchema } from "@/lib/zod/schemas/persCreateSchema";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { engEnumSkills } from "@/lib/refs/translation";
import { SkillsEnum } from "@/lib/types/enums";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Props {
  activeFeatures: any[];
  formId: string;
  onNextDisabledChange?: (disabled: boolean) => void;
  extraExistingSkills?: string[];
}

type Skill = (typeof SkillsEnum)[number];

const isSkill = (value: unknown): value is Skill =>
  typeof value === "string" && (SkillsEnum as readonly string[]).includes(value);

type SkillChoiceFeature = { featureId: number; name: string; choiceCount: number; options: Skill[] };

type NormalizedSkillProficiency =
  | { type: "fixed"; skills: Skill[] }
  | { type: "choice"; choiceCount: number; options: Skill[] };

const normalizeSkillProficiencies = (value: unknown): NormalizedSkillProficiency | null => {
  if (!value) return null;

  if (Array.isArray(value)) {
    const skills = value.filter(isSkill);
    return { type: "fixed", skills };
  }

  if (typeof value === "object") {
    const raw = value as {
      options?: unknown;
      choices?: unknown;
      choiceCount?: unknown;
      chooseAny?: unknown;
      any?: unknown;
    };

    const anyCount = typeof raw.any === "number" ? raw.any : Number(raw.any);
    const choiceCount =
      typeof raw.choiceCount === "number"
        ? raw.choiceCount
        : Number.isFinite(anyCount)
          ? anyCount
          : Number(raw.choiceCount);

    const optionsSource = Array.isArray(raw.options)
      ? raw.options
      : Array.isArray(raw.choices)
        ? raw.choices
        : [];

    const chooseAny = Boolean(raw.chooseAny) || optionsSource.includes("ANY" as any) || Number.isFinite(anyCount);
    const filtered = optionsSource.filter(isSkill) as Skill[];
    const options = chooseAny || filtered.length === 0 ? [...SkillsEnum] : filtered;

    if (Number.isFinite(choiceCount) && choiceCount > 0) {
      return { type: "choice", choiceCount: Math.max(0, Math.trunc(choiceCount)), options };
    }
  }

  return null;
};

export const LevelUpSkillProficienciesForm = ({
  activeFeatures,
  formId,
  onNextDisabledChange,
  extraExistingSkills = [],
}: Props) => {
  const { updateFormData, nextStep } = usePersFormStore();

  const { form, onSubmit } = useStepForm(levelUpSkillProficienciesSchema, (data) => {
    updateFormData(data);
    nextStep();
  });

  useEffect(() => {
    form.register("levelUpSkillSelections");
  }, [form]);

  const existingSkillsSet = useMemo(() => {
    const set = new Set<Skill>();
    extraExistingSkills.forEach((s) => {
      if (isSkill(s)) set.add(s);
    });
    return set;
  }, [extraExistingSkills]);

  const choiceFeatures = useMemo<SkillChoiceFeature[]>(() => {
    return (activeFeatures || [])
      .map((f) => {
        const normalized = normalizeSkillProficiencies(f.skillProficiencies);
        if (!normalized || normalized.type !== "choice") return null;
        return {
          featureId: f.featureId,
          name: f.name as string,
          choiceCount: normalized.choiceCount,
          options: normalized.options,
        };
      })
      .filter(Boolean) as SkillChoiceFeature[];
  }, [activeFeatures]);

  const watchedSelections = form.watch("levelUpSkillSelections");
  const selections = useMemo(() => watchedSelections || {}, [watchedSelections]);

  /// Рахується під час рендера, а не в `useMemo` над `selections`: вибір пишеться вкладеним
  /// `setValue`, і react-hook-form міняє масив усередині того самого обʼєкта. Посилання
  /// лишається тим самим, тож будь-яка памʼять над ним застрягає на значенні з монтування —
  /// і «обрано в іншій рисі» в UI, і гейт унизу.
  const globalSelected = new Set<Skill>();
  Object.values(selections).forEach((list) => {
    (Array.isArray(list) ? list : []).forEach((s) => {
      if (isSkill(s)) globalSelected.add(s);
    });
  });

  /// Крок пускав далі з невитраченими виборами: риса лишалася без навички, а на листі це вже
  /// не лагодиться — те саме, що рішення власника 2026-09-06 закрило в конструкторі. Вимога
  /// обмежена тим, що справді можна натиснути: коли всі запропоновані навички персонаж уже
  /// знає, крок не має права стати глухим кутом.
  const countPickable = (feature: SkillChoiceFeature) => {
    const chosenHere = (selections[feature.featureId] || []) as Skill[];
    return feature.options.filter(
      (skill) => !existingSkillsSet.has(skill) && (!globalSelected.has(skill) || chosenHere.includes(skill))
    ).length;
  };

  const isSelectionUnspent = choiceFeatures.some((feature) => {
    const chosenHere = ((selections[feature.featureId] || []) as Skill[]).length;
    return chosenHere !== Math.min(feature.choiceCount, countPickable(feature));
  });

  useEffect(() => {
    onNextDisabledChange?.(isSelectionUnspent);
  }, [isSelectionUnspent, onNextDisabledChange]);

  if (!choiceFeatures.length) return null;

  const getOrderedOptions = (options: Skill[]) => {
    return engEnumSkills
      .map((s) => s.eng)
      .filter((s) => options.includes(s as Skill)) as Skill[];
  };

  const toggleSkill = (featureId: number, skill: Skill) => {
    const current = (selections[featureId] || []) as Skill[];
    const has = current.includes(skill);
    const next = has ? current.filter((s) => s !== skill) : [...current, skill];
    form.setValue(`levelUpSkillSelections.${featureId}` as any, next);
  };

  return (
    <form id={formId} onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="font-rpg-display text-3xl font-semibold uppercase tracking-widest text-slate-200 sm:text-4xl">
          Навички
        </h2>
        <p className="text-sm text-slate-400">
          Оберіть навички, які дають нові риси на цьому рівні.
        </p>
      </div>

      <div className="space-y-4">
        {choiceFeatures.map((feature) => {
          const current = (selections[feature.featureId] || []) as Skill[];
          const remaining = Math.max(0, feature.choiceCount - current.length);
          const orderedOptions = getOrderedOptions(feature.options);

          return (
            <Card key={feature.featureId} className="border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-100">{feature.name}</p>
                  <p className="text-xs text-slate-400">Обери {feature.choiceCount}</p>
                </div>
                <div className="text-xs text-slate-300">Можна обрати ще {remaining}</div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {orderedOptions.map((skill) => {
                  const isExisting = existingSkillsSet.has(skill);
                  const isSelected = current.includes(skill);
                  const isSelectedElsewhere = globalSelected.has(skill) && !isSelected;
                  const isMaxReached = current.length >= feature.choiceCount;
                  const isDisabled = isExisting || isSelectedElsewhere || (!isSelected && isMaxReached);
                  const skillLabel = engEnumSkills.find((s) => s.eng === skill)?.ukr || skill;

                  return (
                    <Button
                      key={skill}
                      type="button"
                      variant="outline"
                      disabled={isDisabled}
                      className={clsx(
                        "justify-between border-white/15 bg-white/5 text-slate-200 hover:bg-white/7 hover:text-white",
                        (isSelected || isExisting) &&
                          "border-gradient-rpg border-gradient-rpg-active glass-active text-slate-100",
                        isDisabled && !isExisting && "opacity-60",
                        isExisting && "opacity-80"
                      )}
                      onClick={() => !isDisabled && toggleSkill(feature.featureId, skill)}
                    >
                      <span className="flex items-center gap-2">
                        {isExisting && <Lock className="h-3 w-3" />}
                        {skillLabel}
                      </span>
                      {(isSelected || isExisting) && <span className="text-xs">✓</span>}
                    </Button>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </form>
  );
};

export default LevelUpSkillProficienciesForm;
