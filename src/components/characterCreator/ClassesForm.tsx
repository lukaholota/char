"use client";

import { classTranslations, classTranslationsEng } from "@/refs/translation";
import clsx from "clsx";
import { useStepForm } from "@/hooks/useStepForm";
import { classSchema } from "@/zod/schemas/persCreateSchema";
import { ClassI } from "@/types/model-types";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect } from "react";

interface Props {
  classes: ClassI[]
  formId: string
  onNextDisabledChange?: (disabled: boolean) => void
}

export const ClassesForm = (
  {classes, formId, onNextDisabledChange}: Props
) => {
  const {form, onSubmit} = useStepForm(classSchema)

  const chosenClassId = form.watch('classId') || 0

  useEffect(() => {
    onNextDisabledChange?.(false);
  }, [onNextDisabledChange]);

  return (
    <form id={formId} onSubmit={onSubmit} className="w-full space-y-4">
      <div className="space-y-2 text-center">
        <h2 className="text-xl font-semibold text-white">Оберіть клас</h2>
        <p className="text-sm text-slate-400">Лаконічні картки з акцентом на назві та перекладі.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {
          classes.map(c =>  (
            <Card
              key={c.classId}
              className={clsx(
                "cursor-pointer border border-slate-800/80 bg-slate-900/70 transition hover:-translate-y-0.5 hover:border-indigo-500/60",
                c.classId === chosenClassId && "border-indigo-400/80 bg-indigo-500/10 shadow-lg shadow-indigo-500/15"
              )}
              onClick={() => form.setValue('classId', c.classId)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className="text-lg font-semibold text-white">{classTranslations[c.name]}</div>
                  <div className="text-xs text-slate-400">
                    {classTranslationsEng[c.name]}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      <input type="hidden" {...form.register('classId', { valueAsNumber: true })} />
    </form>
  )
};

export default ClassesForm;
