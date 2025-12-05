"use client";

import type {Background} from "@prisma/client"
import {
  backgroundTranslations, backgroundTranslationsEng,
} from "@/lib/refs/translation";
import clsx from "clsx";
import {useStepForm} from "@/hooks/useStepForm";
import {backgroundSchema} from "@/lib/zod/schemas/persCreateSchema";
import { useEffect, useMemo } from "react";
import { Card, CardContent } from "@/lib/components/ui/card";
import { Badge } from "@/lib/components/ui/badge";

interface Props {
  backgrounds: Background[]
  formId: string
  onNextDisabledChange?: (disabled: boolean) => void
}

const PHB_BACKGROUNDS = new Set([
  "ACOLYTE","CHARLATAN","CRIMINAL","ENTERTAINER","FOLK_HERO","GUILD_ARTISAN","GUILD_MERCHANT",
  "HERMIT","NOBLE","OUTLANDER","SAGE","SAILOR","SOLDIER","URCHIN"
]);

const SOURCE_OVERRIDES: Record<string, string> = {
  AZORIUS_FUNCTIONARY: "Ravnica",
  BOROS_LEGIONNAIRE: "Ravnica",
  DIMIR_OPERATIVE: "Ravnica",
  GOLGARI_AGENT: "Ravnica",
  GRUUL_ANARCH: "Ravnica",
  IZZET_ENGINEER: "Ravnica",
  ORZHOV_REPRESENTATIVE: "Ravnica",
  RAKDOS_CULTIST: "Ravnica",
  SELESNYA_INITIATE: "Ravnica",
  SIMIC_SCIENTIST: "Ravnica",
  LOREHOLD_STUDENT: "Strixhaven",
  PRISMARI_STUDENT: "Strixhaven",
  QUANDRIX_STUDENT: "Strixhaven",
  SILVERQUILL_STUDENT: "Strixhaven",
  WITHERBLOOM_STUDENT: "Strixhaven",
  ASTRAL_DRIFTER: "Spelljammer",
  WILDSPACER: "Spelljammer",
  FEYLOST: "Witchlight",
  WITCHLIGHT_HAND: "Witchlight",
  KNIGHT_OF_SOLAMNIA: "Dragonlance",
  MAGE_OF_HIGH_SORCERY: "Dragonlance",
};

export const BackgroundsForm = (
  {backgrounds, formId, onNextDisabledChange}: Props
) => {
  const {form, onSubmit} = useStepForm(backgroundSchema)

  const chosenBackgroundId = form.watch('backgroundId') || 0

      useEffect(() => {
    if (!chosenBackgroundId) {
      onNextDisabledChange?.(true);
      return;
    }
    onNextDisabledChange?.(false);
  }, [onNextDisabledChange, chosenBackgroundId]);


  const primaryBackgrounds = useMemo(
    () => backgrounds.filter(b => PHB_BACKGROUNDS.has(b.name)),
    [backgrounds]
  );
  const otherBackgrounds = useMemo(
    () => backgrounds.filter(b => !PHB_BACKGROUNDS.has(b.name)),
    [backgrounds]
  );

  const sourceLabel = (name: string) => SOURCE_OVERRIDES[name] ?? "Інші джерела";

  return (
    <form id={formId} onSubmit={onSubmit} className="w-full space-y-4">
      <div className="space-y-2 text-center">
        <h2 className="text-xl font-semibold text-white">Оберіть передісторію</h2>
        <p className="text-sm text-slate-400">Базові з PHB видно одразу, інші заховані під акордеоном.</p>
      </div>

      <div className="space-y-3">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">PHB 2014</p>
            <Badge variant="outline" className="border-slate-800 bg-slate-800/60 text-slate-200">Джерело</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {primaryBackgrounds.map(b =>  (
              <Card
                key={b.backgroundId}
                className={clsx(
                  "cursor-pointer border border-slate-800/80 bg-slate-900/70 transition hover:-translate-y-0.5 hover:border-indigo-500/60",
                  b.backgroundId === chosenBackgroundId && "border-indigo-400/80 bg-indigo-500/10 shadow-lg shadow-indigo-500/15"
                )}
                onClick={() => form.setValue('backgroundId', b.backgroundId)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="text-lg font-semibold text-white">{backgroundTranslations[b.name]}</div>
                    <div className="text-xs text-slate-400">
                      {backgroundTranslationsEng[b.name]}
                    </div>
                  </div>
                  <Badge
                    variant={b.backgroundId === chosenBackgroundId ? "secondary" : "outline"}
                    className={`border-slate-700 ${b.backgroundId === chosenBackgroundId ? "bg-indigo-500/20 text-indigo-50" : "bg-slate-800/60 text-slate-200"}`}
                  >
                    PHB
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <details className="rounded-xl border border-slate-800/80 bg-slate-900/60 shadow-inner">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800/80 [&::-webkit-details-marker]:hidden">
            Інші джерела
          </summary>
          <div className="border-t border-slate-800/80 p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {otherBackgrounds.map(b =>  (
                <Card
                  key={b.backgroundId}
                  className={clsx(
                    "cursor-pointer border border-slate-800/80 bg-slate-900/70 transition hover:-translate-y-0.5 hover:border-indigo-500/60",
                    b.backgroundId === chosenBackgroundId && "border-indigo-400/80 bg-indigo-500/10 shadow-lg shadow-indigo-500/15"
                  )}
                  onClick={() => form.setValue('backgroundId', b.backgroundId)}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <div className="text-lg font-semibold text-white">{backgroundTranslations[b.name]}</div>
                      <div className="text-xs text-slate-400">
                        {backgroundTranslationsEng[b.name]}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant={b.backgroundId === chosenBackgroundId ? "secondary" : "outline"}
                        className={`border-slate-700 ${b.backgroundId === chosenBackgroundId ? "bg-indigo-500/20 text-indigo-50" : "bg-slate-800/60 text-slate-200"}`}
                      >
                        Інше
                      </Badge>
                      <Badge variant="outline" className="border-slate-800 bg-slate-800/60 text-slate-200">
                        {sourceLabel(b.name)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </details>
      </div>

      <input type="hidden" {...form.register('backgroundId', { valueAsNumber: true })} />
    </form>
  )
};

export default BackgroundsForm;
