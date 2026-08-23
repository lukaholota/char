"use client";

import { useStepForm } from "@/hooks/useStepForm";
import { subraceSchema } from "@/lib/zod/schemas/persCreateSchema";
import { RaceI } from "@/lib/types/model-types";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { SubraceInfoModal } from "@/lib/components/characterCreator/modals/SubraceInfoModal";
import { subraceTranslations, subraceTranslationsEng } from "@/lib/refs/translation";
import { translateValue } from "@/lib/components/characterCreator/infoUtils";
import { CreationCard } from "@/components/characterCreator/CreationCard";
import { getRaceVisual } from "@/components/characterCreator/creation-visuals";

interface Props {
  race: RaceI;
  formId: string;
  onNextDisabledChange?: (disabled: boolean) => void;
}

export const SubracesForm = ({ race, formId, onNextDisabledChange }: Props) => {
  const { updateFormData, nextStep } = usePersFormStore();
  
  const { form, onSubmit } = useStepForm(subraceSchema, (data) => {
    updateFormData({ subraceId: data.subraceId });
    nextStep();
  });
  
  const chosenSubraceId = form.watch("subraceId");

  useEffect(() => {
    // Subrace selection is optional — user can continue without choosing.
    onNextDisabledChange?.(false);
  }, [onNextDisabledChange]);

  const subraces = race.subraces || [];

  return (
    <form id={formId} onSubmit={onSubmit} className="w-full space-y-4">
      <div className="space-y-2 text-center">
        <h2 className="font-rpg-display text-3xl font-semibold uppercase tracking-widest text-slate-200 sm:text-4xl">
          Оберіть підрасу (необовʼязково)
        </h2>
        <p className="text-sm text-slate-400">Для раси {translateValue(race.name)}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {subraces.map((sr) => {
          const name = subraceTranslations[sr.name] ?? sr.name;
          const engName = subraceTranslationsEng[sr.name] ?? sr.name;
          
          return (
            <CreationCard
              key={sr.subraceId}
              testId={`subrace-${sr.name}`}
              title={name}
              englishTitle={engName}
              visual={getRaceVisual(sr.name || race.name)}
              isSelected={sr.subraceId === chosenSubraceId}
              sourceCode={sr.source}
              infoModal={<SubraceInfoModal subrace={sr} />}
              onClick={(e) => {
                if ((e.target as HTMLElement | null)?.closest?.('[data-stop-card-click]')) return;
                form.setValue("subraceId", sr.subraceId);
              }}
            />
          );
        })}
      </div>

      <div className="flex justify-center">
        <Button
          type="button"
          variant="outline"
          className="border-white/15 bg-white/5 text-slate-200 hover:bg-white/7"
          onClick={() => {
            form.setValue("subraceId", undefined);
            updateFormData({ subraceId: undefined });
            nextStep();
          }}
        >
          Пропустити
        </Button>
      </div>

      <input
        type="hidden"
        {...form.register("subraceId", {
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

export default SubracesForm;
