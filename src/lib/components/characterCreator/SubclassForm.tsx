"use client";

import { useStepForm } from "@/hooks/useStepForm";
import { ClassI, SubclassI } from "@/lib/types/model-types";
import { CreationCard } from "@/components/characterCreator/CreationCard";
import { getClassVisual } from "@/components/characterCreator/creation-visuals";
import { getSubclassImagePath } from "@/lib/assets/image-manifest";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useEffect, useMemo, useState } from "react";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { SubclassInfoModal } from "@/lib/components/characterCreator/modals/SubclassInfoModal";
import { SourceBadge } from "@/lib/components/characterCreator/SourceBadge";
import { translateValue } from "@/lib/components/characterCreator/infoUtils";
import { hasLegacySubclasses, isLegacyChosen, splitSubclassesForStep } from "@/lib/logic/legacy-subclass-visibility";
import { z } from "zod";
import { translateSubclassName, translateSubclassNameEng } from "@/lib/refs/subclass-name";
import { useNextStepHint } from "@/lib/components/wizard/next-step-hint";
import { constructorSubclassEntity } from "@/lib/optimization/bindings";

interface Props {
  cls: ClassI;
  formId: string;
  onNextDisabledChange?: (disabled: boolean) => void;
}

export const SubclassForm = ({ cls, formId, onNextDisabledChange }: Props) => {
  const { updateFormData, nextStep } = usePersFormStore();

  const requiredSubclassSchema = useMemo(
    () =>
      z.object({
        subclassId: z.preprocess(
          (value) => {
            if (value === "" || value === undefined || value === null) return 0;
            const parsed = typeof value === "number" ? value : Number(value);
            return Number.isFinite(parsed) ? parsed : 0;
          },
          z.number().min(1, "Оберіть підклас")
        ),
        subclassChoiceSelections: z.record(z.string(), z.union([z.number().int(), z.array(z.number().int())])).default({}),
      }),
    []
  );
  
  const { form, onSubmit } = useStepForm(requiredSubclassSchema, (data) => {
    updateFormData({ 
      subclassId: data.subclassId,
      subclassChoiceSelections: data.subclassChoiceSelections 
    });
    nextStep();
  });
  
  const chosenSubclassId = form.watch("subclassId");
  const chosenId = typeof chosenSubclassId === "number" ? chosenSubclassId : null;

  useNextStepHint(chosenSubclassId ? null : "Оберіть підклас.");

  useEffect(() => {
    if (!chosenSubclassId) {
      onNextDisabledChange?.(true);
      return;
    }
    onNextDisabledChange?.(false);
  }, [onNextDisabledChange, chosenSubclassId]);

  const allSubclasses = useMemo(() => cls.subclasses ?? [], [cls.subclasses]);
  const offersLegacy = hasLegacySubclasses(allSubclasses);
  const [showLegacy, setShowLegacy] = useState(() => isLegacyChosen(allSubclasses, chosenId));
  const { current, legacy } = useMemo(
    () => splitSubclassesForStep(allSubclasses, showLegacy, (subclass) => translateSubclassName(subclass.name)),
    [allSubclasses, showLegacy],
  );

  const chooseSubclass = (subclassId: number | undefined) => {
    form.setValue("subclassId", subclassId, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    form.setValue("subclassChoiceSelections", {}, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    updateFormData({ subclassId, subclassChoiceSelections: {} });
  };

  const toggleLegacy = (checked: boolean) => {
    if (!checked && isLegacyChosen(allSubclasses, chosenId)) chooseSubclass(undefined);
    setShowLegacy(checked);
  };

  const renderCards = (subclasses: SubclassI[]) =>
    subclasses.map((sc) => (
      <SubclassCardOption
        cls={cls}
        key={sc.subclassId}
        subclass={sc}
        chosen={sc.subclassId === chosenId}
        onChoose={() => {
          if (sc.subclassId !== chosenId) chooseSubclass(sc.subclassId);
        }}
      />
    ));

  return (
    <form id={formId} onSubmit={onSubmit} className="w-full space-y-4">
      <div className="space-y-2 text-center">
        <h2 className="font-rpg-display text-3xl font-semibold uppercase tracking-widest text-slate-200 sm:text-4xl">
          Оберіть підклас
        </h2>
        <p className="text-sm text-slate-400">Для класу {translateValue(cls.name)}</p>
      </div>
      {offersLegacy && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="show-legacy-subclasses" className="font-semibold text-slate-200">
              Підкласи зі старих книг
            </Label>
            <Switch id="show-legacy-subclasses" checked={showLegacy} onCheckedChange={toggleLegacy} />
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Правила 2024 дозволяють підклас із книги 2014 без перевидання. Риси нижче 3-го рівня ви отримуєте на 3-му.
          </p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">{renderCards(current)}</div>
      {legacy.length > 0 && (
        <section className="space-y-2" aria-label="Зі старих книг">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Зі старих книг</h3>
          <div className="grid gap-4 sm:grid-cols-2">{renderCards(legacy)}</div>
        </section>
      )}
      <input
        type="hidden"
        {...form.register("subclassId", {
          setValueAs: (value) => {
            if (value === "" || value === undefined || value === null) return undefined;
            const num = typeof value === "number" ? value : Number(value);
            return Number.isFinite(num) ? num : undefined;
          },
        })}
      />
    </form>
  );
};

function SubclassCardOption({ cls, subclass, chosen, onChoose }: { cls: ClassI; subclass: SubclassI; chosen: boolean; onChoose: () => void }) {
  const visual = { ...getClassVisual(cls.name), imageSrc: getSubclassImagePath(subclass.name) };

  return (
    <div className="relative">
      <CreationCard
        testId={`subclass-${subclass.name}`}
        title={translateSubclassName(subclass.name)}
        englishTitle={translateSubclassNameEng(subclass.name)}
        visual={visual}
        isSelected={chosen}
        is2024={cls.ruleset === "RULES_2024"}
        infoModal={<SubclassInfoModal subclass={subclass} analysisEntity={constructorSubclassEntity(cls, subclass)} />}
        onClick={(e) => {
          if ((e.target as HTMLElement | null)?.closest?.("[data-stop-card-click]")) return;
          onChoose();
        }}
      />
      {subclass.legacySource && (
        <div className="absolute left-3 top-3 z-20">
          <SourceBadge code={subclass.legacySource} active={chosen} />
        </div>
      )}
    </div>
  );
}

export default SubclassForm;
