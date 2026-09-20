"use client";

import { useEffect, useState } from "react";
import { getLevelUpClassOptionSpellOffer } from "@/lib/actions/levelup";
import type { ClassOptionSpellOffer } from "@/server/db/class-option-spell-choices";

/**
 * Книга тіней залежить від викликів, обраних тим самим кроком; Магічні відкриття — від класу й
 * підкласу, що отримують рівень. Сервер вирішує, чи є що обирати, тож запит іде на кожну зміну.
 */
export function useLevelUpClassOptionSpellOffer(input: {
  persId: number | undefined;
  classId: number | undefined;
  subclassId: number | null;
  classChoiceSelections: Record<string, number | number[]> | undefined;
}): ClassOptionSpellOffer | null {
  const [offer, setOffer] = useState<ClassOptionSpellOffer | null>(null);
  const optionKey = joinOptionIds(input.classChoiceSelections);
  const { persId, classId, subclassId } = input;

  useEffect(() => {
    if (!persId || (!classId && !optionKey)) return;
    let isCurrent = true;
    const optionIds = optionKey ? optionKey.split(",").map(Number) : [];
    getLevelUpClassOptionSpellOffer(persId, optionIds, classId ? { classId, subclassId } : null).then((loaded) => {
      if (isCurrent) setOffer(loaded);
    });
    return () => {
      isCurrent = false;
    };
  }, [persId, classId, subclassId, optionKey]);

  return classId || optionKey ? offer : null;
}

function joinOptionIds(selections: Record<string, number | number[]> | undefined): string {
  return Object.values(selections ?? {})
    .flat()
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0)
    .sort((a, b) => a - b)
    .join(",");
}
