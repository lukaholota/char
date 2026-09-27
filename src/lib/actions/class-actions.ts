"use server";

import { prisma } from "@/lib/prisma";
import { loadClassSubclasses } from "@/server/db/class-content";
import { loadCreationSpellOffer, type ClassSpellOffer } from "@/server/db/class-spell-choices";
import { loadClassOptionSpellOffer, type ClassOptionSpellOffer } from "@/server/db/class-option-spell-choices";
import { loadRaceAtCreation2014, loadRaceSpellOffer2014, type RaceSpellOffer2014 } from "@/server/db/race-spell-choices-2014";

export async function getSubclassesByClassId(classId: number) {
  const normalizedClassId = Number(classId);
  if (!Number.isFinite(normalizedClassId) || normalizedClassId <= 0) return [];

  return loadClassSubclasses(normalizedClassId);
}

/** Підклас 1-го рівня важить для 2014: покровитель чорнокнижника додає свій розширений список. */
export async function getCreationSpellOffer(classId: number, classChoiceOptionIds: number[], subclassId: number | null = null): Promise<ClassSpellOffer | null> {
  const normalizedClassId = Number(classId);
  if (!Number.isFinite(normalizedClassId) || normalizedClassId <= 0) return null;

  const optionIds = (Array.isArray(classChoiceOptionIds) ? classChoiceOptionIds : [])
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);
  const normalizedSubclassId = Number.isInteger(Number(subclassId)) && Number(subclassId) > 0 ? Number(subclassId) : null;
  return loadCreationSpellOffer(prisma, { classId: normalizedClassId, subclassId: normalizedSubclassId, classChoiceOptionIds: optionIds });
}

/** Книга тіней і риса підкласу 1-го рівня в конструкторі: заклинання, уже обрані класом і рисою, не пропонуються. */
export async function getCreationClassOptionSpellOffer(
  classChoiceOptionIds: number[],
  takenSpellIds: number[],
  subclassId: number | null = null,
): Promise<ClassOptionSpellOffer | null> {
  const [normalizedSubclassId] = toPositiveIds([subclassId]);
  return loadClassOptionSpellOffer(prisma, {
    newlyChosenOptionIds: toPositiveIds(classChoiceOptionIds),
    subclassAtLevel: normalizedSubclassId ? { subclassId: normalizedSubclassId, classLevel: 1 } : null,
    unavailableSpellIds: toPositiveIds(takenSpellIds),
  });
}

/** Замовляння раси 2014 у конструкторі: заклинання, уже обрані класом і підкласом, не пропонуються. */
export async function getCreationRaceSpellOffer(
  raceId: number,
  subraceId: number | null,
  raceChoiceOptionIds: number[],
  takenSpellIds: number[],
): Promise<RaceSpellOffer2014 | null> {
  const [normalizedRaceId] = toPositiveIds([raceId]);
  if (!normalizedRaceId) return null;
  const [normalizedSubraceId] = toPositiveIds([subraceId]);
  const race = await loadRaceAtCreation2014(prisma, {
    raceId: normalizedRaceId,
    subraceId: normalizedSubraceId ?? null,
    raceChoiceOptionIds: toPositiveIds(raceChoiceOptionIds),
  });
  return race ? loadRaceSpellOffer2014(prisma, { ...race, unavailableSpellIds: toPositiveIds(takenSpellIds) }) : null;
}

function toPositiveIds(ids: unknown): number[] {
  return (Array.isArray(ids) ? ids : []).map(Number).filter((id) => Number.isInteger(id) && id > 0);
}
