"use server";

import { prisma } from "@/lib/prisma";
import { loadClassSubclasses } from "@/server/db/class-content";
import { loadCreationSpellOffer, type ClassSpellOffer } from "@/server/db/class-spell-choices";
import { loadClassOptionSpellOffer, type ClassOptionSpellOffer } from "@/server/db/class-option-spell-choices";

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

/** Книга тіней у конструкторі: заклинання, уже обрані класом і рисою, до книги не пропонуються. */
export async function getCreationClassOptionSpellOffer(classChoiceOptionIds: number[], takenSpellIds: number[]): Promise<ClassOptionSpellOffer | null> {
  return loadClassOptionSpellOffer(prisma, { newlyChosenOptionIds: toPositiveIds(classChoiceOptionIds), unavailableSpellIds: toPositiveIds(takenSpellIds) });
}

function toPositiveIds(ids: unknown): number[] {
  return (Array.isArray(ids) ? ids : []).map(Number).filter((id) => Number.isInteger(id) && id > 0);
}
