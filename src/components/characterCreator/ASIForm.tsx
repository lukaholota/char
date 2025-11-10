"use client";

import {useStepForm} from "@/hooks/useStepForm";
import { Class, Race } from "@prisma/client";
import {asiSchema} from "@/zod/schemas/persCreateSchema";
import { useFieldArray } from "react-hook-form";

interface Props {
  race?: Race
  selectedClass?: Class
}

const attributes = [
  { eng: 'STR', urk: 'Сила' },
  { eng: 'DEX', urk: 'Спритність' },
  { eng: 'CON', urk: 'Статура' },
  { eng: 'INT', urk: 'Інтелект' },
  { eng: 'WIS', urk: 'Мудрість' },
  { eng: 'CHA', urk: 'Харизма' }
];


export const ASIForm = (
  {race, selectedClass}: Props
) => {
  const {form, onSubmit} = useStepForm(asiSchema)

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "asi",
  });

  const isDefaultASI = form.watch('isDefaultASI') || false
  const isSimpleASI = form.watch('isSimpleASI') || false
  const isCustomASI = form.watch('isCustomASI') || false
  const isPointBuyASI = form.watch('isPointBuyASI') || true

  const incrementValue = (index: number) => {
    const currentValue = (form.getValues(`asi.${index}.value`) || 0)   as number;
    form.setValue(`asi.${index}.value`, currentValue + 1)
  }

  return (
    <form onSubmit={onSubmit}>
      <h2 className="my-5">Оберіть Стати</h2>

      {form.formState.errors.asi && (
        <p className="text-red-500 text-sm">
          {form.formState.errors.asi.message}
        </p>
      )}


      <div>
        {
          isPointBuyASI && (
            <div>
              {attributes.map((a, i) => (
                <div key={i}>
                  <span className="m-1">
                    {a.urk}

                  </span>
                </div>
              ))}
            </div>
          )
        }
      </div>


      <label className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          {...form.register("isDefaultASI")}
          className="w-4 h-4"
        />
        <span>Не використовувати правила Таші &#34;вільного розподілу&#34;?</span>
      </label>


      <input type="hidden" {...form.register('backgroundId', {valueAsNumber: true})} />

      <button type="submit" className="mt-4 px-6 py-2 bg-violet-600 rounded">
        Далі →
      </button>
    </form>
  )
};

export default ASIForm;