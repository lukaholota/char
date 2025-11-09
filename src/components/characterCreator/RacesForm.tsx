"use client";

import type { Race } from "@prisma/client"
import { useState } from "react";
import { raceTranslations, raceTranslationsEng } from "@/refs/translation";

interface Props {
  races: Race[]
}

export const RacesForm = (
  { races }: Props
) => {
  const [chosenRaceId, setChosenRaceId] = useState<number>(0)

  console.log('Current chosenRaceId:', chosenRaceId) // 👈 Дивись що тут

  return (
    <>
      <h2 className="my-5">Оберіть расу</h2>

      {
        races.map(r => {
            const isChosen = r.raceId === chosenRaceId
            console.log(`Race ${ r.name } (${ r.raceId }): isChosen = ${ isChosen }`) // 👈 І тут

            return (
              <div
                key={ r.raceId }
                className={ `p-3 border-slate-800 border-[1px] bg-violet-900  cursor-pointer hover:bg-violet-800 my-2 rounded-xl ${isChosen
                  ? 'bg-violet-700 border-slate-700 hover:bg-violet-700'
                  : '' }` }
                onClick={ () => setChosenRaceId(r.raceId) }
              >
                { raceTranslations[r.name] }
                <div className="text-xs text-slate-400">
                  { raceTranslationsEng[r.name] }
                </div>
              </div>
            )
          }
        )
      }
    </>
  )
};

export default RacesForm;