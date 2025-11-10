"use client";

import {useStepForm} from "@/hooks/useStepForm";
import {Race} from "@prisma/client";
import {asiSchema} from "@/zod/schemas/persCreateSchema";

interface Props {
  race: Race
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
  {race}: Props
) => {
  const {form, onSubmit} = useStepForm(asiSchema)

  const chosenASI = form.watch('asi') || 0
  const isDefaultASI = form.watch('isDefaultASI') || false
  const isSimpleASI = form.watch('isSimpleASI') || false
  const isCustomASI = form.watch('isCustomASI') || false
  const isPointBuyASI = form.watch('isPointBuyASI') || true

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