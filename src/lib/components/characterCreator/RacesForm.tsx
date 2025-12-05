"use client";

import { raceTranslations, raceTranslationsEng } from "@/lib/refs/translation";
import clsx from "clsx";
import { useStepForm } from "@/hooks/useStepForm";
import { raceSchema } from "@/lib/zod/schemas/persCreateSchema";
import { RaceI } from "@/lib/types/model-types";
import { Card, CardContent } from "@/lib/components/ui/card";
import { Badge } from "@/lib/components/ui/badge";
import { useEffect, useMemo } from "react";

interface Props {
  races: RaceI[]
  formId: string
  onNextDisabledChange?: (disabled: boolean) => void
}

export const RacesForm = (
  {races, formId, onNextDisabledChange}: Props
) => {
  const {form, onSubmit} = useStepForm(raceSchema)

  const chosenRaceId = form.watch('raceId') || 0

  useEffect(() => {
    if (!chosenRaceId) {
      onNextDisabledChange?.(true);
      return;
    }
    onNextDisabledChange?.(false);
  }, [onNextDisabledChange, chosenRaceId]);

  const SOURCE_LABELS: Record<string, string> = {
    MPMM: "Monsters of the Multiverse",
    GGTR: "Ravnica",
    EBERRON: "Еберрон",
    SACOC: "Witchlight",
    AI: "Acquisitions Incorporated",
    LR: "Locathah Rising",
    OGA: "One Grung Above",
    DRAGONLANCE: "Dragonlance",
    SPELLJAMMER: "Spelljammer",
  };

  const sourceLabelFromName = (name: string) => {
    const suffix = name.split('_').pop() || '';
    if (suffix === '2014') return 'PHB 2014';
    if (suffix === '2024') return 'PHB 2024';
    return SOURCE_LABELS[suffix] ?? 'Інші джерела';
  };

  const coreRaces = useMemo(() => races.filter(r => r.name.endsWith('2014')), [races]);
  const otherRaces = useMemo(() => races.filter(r => !r.name.endsWith('2014')), [races]);

  return (
    <form id={formId} onSubmit={onSubmit} className="w-full space-y-4">
      <div className="space-y-2 text-center">
        <h2 className="text-xl font-semibold text-white">Оберіть расу</h2>
        <p className="text-sm text-slate-400">Картки зручніші, торкніться щоб активувати.</p>
      </div>

      <div className="space-y-3">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">PHB 2014</p>
            <Badge variant="outline" className="border-slate-800 bg-slate-800/60 text-slate-200">Джерело</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {coreRaces.map(r =>  (
              <Card
                key={r.raceId}
                className={clsx(
                  "cursor-pointer border border-slate-800/80 bg-slate-900/70 transition hover:-translate-y-0.5 hover:border-indigo-500/60",
                  r.raceId === chosenRaceId && "border-indigo-400/80 bg-indigo-500/10 shadow-lg shadow-indigo-500/15"
                )}
                onClick={() => form.setValue('raceId', r.raceId)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="text-lg font-semibold text-white">{raceTranslations[r.name]}</div>
                    <div className="text-xs text-slate-400">
                      {raceTranslationsEng[r.name]}
                    </div>
                  </div>
                  <Badge
                    variant={r.raceId === chosenRaceId ? "secondary" : "outline"}
                    className={`border-slate-700 ${r.raceId === chosenRaceId ? "bg-indigo-500/20 text-indigo-50" : "bg-slate-800/60 text-slate-200"}`}
                  >
                    {r.subraces?.length || 0} підрас
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
              {otherRaces.map(r =>  (
                <Card
                  key={r.raceId}
                  className={clsx(
                    "cursor-pointer border border-slate-800/80 bg-slate-900/70 transition hover:-translate-y-0.5 hover:border-indigo-500/60",
                    r.raceId === chosenRaceId && "border-indigo-400/80 bg-indigo-500/10 shadow-lg shadow-indigo-500/15"
                  )}
                  onClick={() => form.setValue('raceId', r.raceId)}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <div className="text-lg font-semibold text-white">{raceTranslations[r.name]}</div>
                      <div className="text-xs text-slate-400">
                        {raceTranslationsEng[r.name]}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant={r.raceId === chosenRaceId ? "secondary" : "outline"}
                        className={`border-slate-700 ${r.raceId === chosenRaceId ? "bg-indigo-500/20 text-indigo-50" : "bg-slate-800/60 text-slate-200"}`}
                      >
                        {r.subraces?.length || 0} підрас
                      </Badge>
                      <Badge variant="outline" className="border-slate-800 bg-slate-800/60 text-slate-200">
                        {sourceLabelFromName(r.name)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </details>
      </div>

      <input type="hidden" {...form.register('raceId', { valueAsNumber: true })} />
    </form>
  )
};

export default RacesForm;
