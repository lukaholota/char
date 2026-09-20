"use server";

import { auth } from "@/lib/auth";
import { parseLevelUpInput } from "@/lib/zod/schemas/levelUpSchema";
import {
  executeLevelUp,
  getLevelUpInfo as getPersistedLevelUpInfo,
  loadLevelUpFeatSpellGrowthOffer,
  loadLevelUpFeatSpellOffer,
  loadLevelUpSpellOffer,
} from "@/server/db/levelup-persistence";
import { loadLevelUpClassOptionSpellOffer } from "@/server/db/levelup-class-option-spells";

export async function getLevelUpInfo(persId: number) {
  return getPersistedLevelUpInfo(persId);
}

export async function levelUpCharacter(persId: number, input: unknown) {
  const session = await auth();
  if (!session?.user?.email) return { error: "Unauthorized" };

  return executeLevelUp(persId, parseLevelUpInput(input));
}

export async function getLevelUpSpellOffer(persId: number, classId: number, subclassId: number | null, classChoiceOptionIds: number[]) {
  return loadLevelUpSpellOffer(Number(persId), {
    classId: Number(classId),
    subclassId: subclassId ? Number(subclassId) : null,
    classChoiceOptionIds: toPositiveIds(classChoiceOptionIds),
  });
}

export async function getLevelUpFeatSpellGrowthOffer(persId: number) {
  return loadLevelUpFeatSpellGrowthOffer(Number(persId));
}

export async function getLevelUpFeatSpellOffer(persId: number, featId: number, featChoiceOptionIds: number[]) {
  return loadLevelUpFeatSpellOffer(Number(persId), { featId: Number(featId), featChoiceOptionIds: toPositiveIds(featChoiceOptionIds) });
}

function toPositiveIds(ids: unknown): number[] {
  return (Array.isArray(ids) ? ids : []).map(Number).filter((id) => Number.isInteger(id) && id > 0);
}

/** Pact of the Tome, узятий на цьому підвищенні, просить Книгу тіней; Колегія знань на 6-му — Магічні відкриття. */
export async function getLevelUpClassOptionSpellOffer(
  persId: number,
  classChoiceOptionIds: number[],
  target: { classId: number; subclassId: number | null } | null = null,
) {
  const classId = Number(target?.classId);
  return loadLevelUpClassOptionSpellOffer(
    Number(persId),
    toPositiveIds(classChoiceOptionIds),
    Number.isInteger(classId) && classId > 0 ? { classId, subclassId: target?.subclassId ? Number(target.subclassId) : null } : null,
  );
}
