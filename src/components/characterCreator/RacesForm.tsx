"use client";

import type {Race} from "@prisma/client"
import {raceTranslations, raceTranslationsEng} from "@/refs/translation";
import clsx from "clsx";
import {useStepForm} from "@/hooks/useStepForm";
import {raceSchema} from "@/zod/schemas/persCreateSchema";

interface Props {
  races: Race[]
}

export const RacesForm = (
  {races}: Props
) => {
  const {form, onSubmit} = useStepForm(raceSchema)

  const chosenRaceId = form.watch('raceId') || 0

  return (
    <form onSubmit={onSubmit}>
      <h2 className="my-5">Оберіть расу</h2>

      {form.formState.errors.raceId && (
        <p className="text-red-500 text-sm">
          {form.formState.errors.raceId.message}
        </p>
      )}

      {
        races.map(r =>  (
              <div
                key={r.raceId}
                className={clsx(
                  "p-3 border-[1px] cursor-pointer my-2 rounded-xl",
                  r.raceId === chosenRaceId
                    ? "bg-violet-700 border-slate-700"
                    : "bg-violet-900 border-slate-800 hover:bg-violet-800"
                )}
                onClick={() => form.setValue('raceId', r.raceId)}
              >
                <div>{raceTranslations[r.name]}</div>
                <div className="text-xs text-slate-400">
                  {raceTranslationsEng[r.name]}
                </div>
              </div>
            ))}

        <input type="hidden" {...form.register('raceId', { valueAsNumber: true })} />

        <button type="submit" className="mt-4 px-6 py-2 bg-violet-600 rounded">
          Далі →
        </button>
    </form>
  )
};

export default RacesForm;