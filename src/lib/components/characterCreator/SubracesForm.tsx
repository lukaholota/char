"use client";

import { useStepForm } from "@/hooks/useStepForm";
import { subraceSchema } from "@/lib/zod/schemas/persCreateSchema";
import { RaceI } from "@/lib/types/model-types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import clsx from "clsx";
import { useEffect } from "react";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { SubraceInfoModal } from "@/lib/components/characterCreator/modals/SubraceInfoModal";
import { SourceBadge } from "@/lib/components/characterCreator/SourceBadge";
import { sourceTranslations, subraceTranslations, subraceTranslationsEng } from "@/lib/refs/translation";
import {
  // formatArmorProficiencies,
  formatASI,
  formatLanguages,
  // formatList,
  // formatSkillProficiencies,
  formatSpeeds,
  formatToolProficiencies,
  // formatWeaponProficiencies,
  translateValue,
} from "@/lib/components/characterCreator/infoUtils";
import { FormattedDescription } from "@/components/ui/FormattedDescription";

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
      <div className="grid gap-3 sm:grid-cols-2">
        {subraces.map((sr) => {
          const name = subraceTranslations[sr.name] ?? sr.name;
          const engName = subraceTranslationsEng[sr.name] ?? sr.name;
          
          return (
          <Card
            key={sr.subraceId}
            className={clsx(
              "glass-card cursor-pointer transition-all duration-200",
              sr.subraceId === chosenSubraceId && "glass-active"
            )}
            onClick={(e) => {
              if ((e.target as HTMLElement | null)?.closest?.('[data-stop-card-click]')) return;
              form.setValue("subraceId", sr.subraceId);
            }}
          >
            <CardContent className="relative flex items-center justify-between p-4">
              <SubraceInfoModal subrace={sr} />
              <div>
                <div className="text-lg font-semibold text-white">{name}</div>
                <div className="text-xs text-slate-400">{engName}</div>
              </div>
              <SourceBadge code={sr.source} active={sr.subraceId === chosenSubraceId} />
            </CardContent>
          </Card>
        )})}
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
