"use client";

import type {Class} from "@prisma/client"
import {classTranslations, classTranslationsEng} from "@/refs/translation";
import clsx from "clsx";
import {useStepForm} from "@/hooks/useStepForm";
import {classSchema} from "@/zod/schemas/persCreateSchema";
import { ClassI } from "@/types/model-types";

interface Props {
  classes: ClassI[]
}

export const ClassesForm = (
  {classes}: Props
) => {
  const {form, onSubmit} = useStepForm(classSchema)

  const chosenClassId = form.watch('classId') || 0

  return (
    <form onSubmit={onSubmit}>
      <h2 className="my-5">Оберіть клас</h2>

      {form.formState.errors.classId && (
        <p className="text-red-500 text-sm">
          {form.formState.errors.classId.message}
        </p>
      )}

      {
        classes.map(c =>  (
          <div
            key={c.classId}
            className={clsx(
              "p-3 border-[1px] cursor-pointer my-2 rounded-xl",
              c.classId === chosenClassId
                ? "bg-violet-700 border-slate-700"
                : "bg-violet-900 border-slate-800 hover:bg-violet-800"
            )}
            onClick={() => form.setValue('classId', c.classId)}
          >
            <div>{classTranslations[c.name]}</div>
            <div className="text-xs text-slate-400">
              {classTranslationsEng[c.name]}
            </div>
          </div>
        ))}

      <input type="hidden" {...form.register('classId', { valueAsNumber: true })} />

      <button type="submit" className="mt-4 px-6 py-2 bg-violet-600 rounded">
        Далі →
      </button>
    </form>
  )
};

export default ClassesForm;