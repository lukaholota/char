"use server";

import { prisma } from "@/lib/prisma";
import type { FeatSpellChoiceOffer } from "@/rules/feat-spell-choices";
import { loadCreationFeatSpellOffer } from "@/server/db/feat-spell-choices";

export async function getCreationFeatSpellOffer(featId: number, choiceOptionIds: number[]): Promise<FeatSpellChoiceOffer | null> {
  const normalizedFeatId = Number(featId);
  if (!Number.isInteger(normalizedFeatId) || normalizedFeatId <= 0) return null;

  const optionIds = (Array.isArray(choiceOptionIds) ? choiceOptionIds : []).map(Number).filter((id) => Number.isInteger(id) && id > 0);
  return loadCreationFeatSpellOffer(prisma, { featId: normalizedFeatId, chosenOptionIds: optionIds });
}
