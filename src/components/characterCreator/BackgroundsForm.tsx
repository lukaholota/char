"use client";

import type {Background} from "@prisma/client"
import {
  backgroundTranslations, backgroundTranslationsEng,
} from "@/refs/translation";
import clsx from "clsx";
import {useStepForm} from "@/hooks/useStepForm";
import {backgroundSchema} from "@/zod/schemas/persCreateSchema";

interface Props {
  backgrounds: Background[]
}

export const BackgroundsForm = (
  {backgrounds}: Props
) => {
  const {form, onSubmit} = useStepForm(backgroundSchema)

  const chosenBackgroundId = form.watch('backgroundId') || 0

  return (
    <form onSubmit={onSubmit}>
      <h2 className="my-5">Оберіть передісторію</h2>

      {form.formState.errors.backgroundId && (
        <p className="text-red-500 text-sm">
          {form.formState.errors.backgroundId.message}
        </p>
      )}

      {
        backgrounds.map(b =>  (
          <div
            key={b.backgroundId}
            className={clsx(
              "p-3 border-[1px] cursor-pointer my-2 rounded-xl",
              b.backgroundId === chosenBackgroundId
                ? "bg-violet-700 border-slate-700"
                : "bg-violet-900 border-slate-800 hover:bg-violet-800"
            )}
            onClick={() => form.setValue('backgroundId', b.backgroundId)}
          >
            <div>{backgroundTranslations[b.name]}</div>
            <div className="text-xs text-slate-400">
              {backgroundTranslationsEng[b.name]}
            </div>
          </div>
        ))}

      <input type="hidden" {...form.register('backgroundId', { valueAsNumber: true })} />

      <button type="submit" className="mt-4 px-6 py-2 bg-violet-600 rounded">
        Далі →
      </button>
    </form>
  )
};

export default BackgroundsForm;