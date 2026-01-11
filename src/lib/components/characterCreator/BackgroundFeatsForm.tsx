"use client";

import { useStepForm } from "@/hooks/useStepForm";
import { backgroundFeatSchema } from "@/lib/zod/schemas/persCreateSchema";
import { Feat } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { SourceBadge } from "@/lib/components/characterCreator/SourceBadge";
import { featTranslations } from "@/lib/refs/translation";
import { FeatInfoModal } from "@/lib/components/characterCreator/modals/FeatInfoModal";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

import { normalizeRaceASI } from "@/lib/components/characterCreator/infoUtils";
import { RaceI, RaceASI } from "@/lib/types/model-types";
import { Subrace, RaceVariant, Ability, Races } from "@prisma/client";
import { checkFeatPrerequisites } from "@/lib/logic/prerequisiteUtils";

interface Props {
  feats: Feat[];
  formId: string;
  onNextDisabledChange?: (disabled: boolean) => void;
  race: RaceI | undefined;
  subrace: Subrace | undefined;
  raceVariant: RaceVariant | undefined | null;

  prereqContext?: {
    level?: number;
    stats?: Record<Ability, number>;
    hasSpellcasting?: boolean;
    race?: Races;
  };
}

export const BackgroundFeatsForm = ({ feats, formId, onNextDisabledChange, race, subrace, raceVariant, prereqContext }: Props) => {
  const { updateFormData, nextStep, formData } = usePersFormStore();
  
  const { form, onSubmit } = useStepForm(backgroundFeatSchema, (data) => {
    updateFormData({ backgroundFeatId: data.backgroundFeatId, backgroundFeatChoiceSelections: {} } as any);
    nextStep();
  });
  
  const chosenFeatId = form.watch("backgroundFeatId");
  const search = form.watch("backgroundFeatSearch");

  useEffect(() => {
    if (!chosenFeatId) {
      onNextDisabledChange?.(true);
      return;
    }
    onNextDisabledChange?.(false);
  }, [onNextDisabledChange, chosenFeatId]);

  const filteredFeats = useMemo(() => {
    const normalizedSearch = (search || "").toLowerCase().trim();
    if (!normalizedSearch) return feats;
    return feats.filter(f => {
      const name = featTranslations[f.name] ?? f.name;
      return name.toLowerCase().includes(normalizedSearch) || 
             f.engName.toLowerCase().includes(normalizedSearch);
    });
  }, [feats, search]);

  return (
    <form id={formId} onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-1 text-center">
        <h2 className="font-rpg-display text-3xl font-semibold uppercase tracking-widest text-slate-200 sm:text-4xl">
          Риса за походженням
        </h2>
        <p className="text-sm text-slate-400">
          Ваша передісторія надає вам додаткову рису.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input 
          {...form.register("backgroundFeatSearch")}
          placeholder="Пошук риси за назвою..."
          className="pl-10 border-white/10 bg-white/5 text-white focus-visible:ring-cyan-400/30"
        />
        {search && (
          <button 
            type="button"
            onClick={() => form.setValue("backgroundFeatSearch", "")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredFeats.map((f) => {
          const isActive = chosenFeatId === f.featId;
          const ukrName = featTranslations[f.name] ?? f.name;

          return (
            <Card
              key={f.featId}
              className={clsx(
                "glass-card cursor-pointer transition-all duration-200",
                isActive ? "glass-active" : "hover:bg-white/5"
              )}
              onClick={() => form.setValue("backgroundFeatId", f.featId)}
            >
              <CardContent className="flex h-full flex-col justify-between p-4 relative">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <p className="text-lg font-semibold text-white leading-tight">
                        {ukrName}
                      </p>
                      <p className="text-xs text-slate-400 italic">
                        {f.engName}
                      </p>
                    </div>
                    <SourceBadge code={f.source} active={isActive} />
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {f.category && (
                        <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400/80">
                            {f.category}
                        </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <FeatInfoModal feat={f as any} trigger={(
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-8 px-2 text-xs text-slate-400 hover:text-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Детальніше
                    </Button>
                  )} />

                  <div className={clsx(
                    "flex h-6 w-6 items-center justify-center rounded-full border transition-colors",
                    isActive ? "bg-emerald-500 border-emerald-400 text-white" : "border-white/10 bg-white/5"
                  )}>
                    {isActive && <Check className="h-4 w-4" />}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredFeats.length === 0 && (
        <div className="py-12 text-center text-slate-500">
          <p>Ничего не найдено по вашему запросу :(</p>
        </div>
      )}
    </form>
  );
};
