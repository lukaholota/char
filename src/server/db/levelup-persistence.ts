"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { loadFeatSpellChoiceOffer, loadFeatSpellGrowthOffer } from "@/server/db/feat-spell-choices";
import type { FeatSpellChoiceOffer, FeatSpellGrowthOffer } from "@/rules/feat-spell-choices";
import { loadClassSpellOffer, type ClassSpellOffer } from "@/server/db/class-spell-choices";
import type { RulesetId } from "@/rules/strategies/types";

import type { LevelUpInput } from "@/lib/zod/schemas/levelUpSchema";
import { findUserIdByEmail } from "@/server/db/users";
import { canEditPers } from "@/lib/actions/pers";
import { captureServerPostHogEvent } from "@/lib/monitoring/posthog-server";
import { createStandaloneLevelUpExecutor, executeLevelUpStep, loadLevelUpStepInfo } from "@/server/db/levelup-step";
import { moveToCurrentPresetRevision } from "@/server/db/preset-revision";

export async function getLevelUpInfo(persId: number) {
  const accessError = await findLevelUpAccessError(persId);
  if (accessError) return accessError;

  return loadLevelUpStepInfo(prisma, persId);
}

async function findLevelUpAccessError(persId: number): Promise<{ error: string } | null> {
  const session = await auth();
  if (!session?.user?.email) return { error: "Unauthorized" };

  const userId = await findUserIdByEmail(session.user.email);
  if (userId === null) return { error: "Unauthorized" };

  // Той самий гейт, що на маршрутах /api/character* (character-access.ts): власник,
  // співвласник або редактор теки. Без нього будь-хто залогінений бачив чужі кроки підвищення.
  const canEdit = await canEditPers(persId, userId);
  if (!canEdit) return { error: "Character not found" };

  return null;
}

/** Список кроку «Заклинання» майстра: той самий завантажувач, яким `executeLevelUp` перевіряє вибір. */
export async function loadLevelUpSpellOffer(persId: number, input: LevelUpSpellOfferInput): Promise<ClassSpellOffer | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  const userId = await findUserIdByEmail(session.user.email);
  if (userId === null || !(await canEditPers(persId, userId))) return null;

  return loadPersLevelUpSpellOffer(persId, input);
}

export async function loadLevelUpFeatSpellOffer(persId: number, input: { featId: number; featChoiceOptionIds: readonly number[] }): Promise<FeatSpellChoiceOffer | null> {
  return loadPersFeatSpellOffer(persId, input, 1);
}

// Риса з листа береться на поточному рівні персонажа, а не на наступному.
export async function loadSheetFeatSpellOffer(persId: number, input: { featId: number; featChoiceOptionIds: readonly number[] }): Promise<FeatSpellChoiceOffer | null> {
  return loadPersFeatSpellOffer(persId, input, 0);
}

async function loadPersFeatSpellOffer(
  persId: number,
  input: { featId: number; featChoiceOptionIds: readonly number[] },
  characterLevelOffset: number,
): Promise<FeatSpellChoiceOffer | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  const userId = await findUserIdByEmail(session.user.email);
  if (userId === null || !(await canEditPers(persId, userId))) return null;

  const [pers, feat] = await Promise.all([
    prisma.pers.findUnique({ where: { persId }, select: { ruleset: true, level: true, persSpells: { select: { spellId: true } } } }),
    prisma.feat.findUnique({ where: { featId: input.featId }, select: { name: true } }),
  ]);
  if (!pers || !feat) return null;

  return loadFeatSpellChoiceOffer(prisma, {
    ruleset: pers.ruleset as RulesetId,
    featName: feat.name,
    chosenOptionIds: input.featChoiceOptionIds,
    context: { characterLevel: pers.level + characterLevelOffset, ownedFeatSpellCount: 0 },
    unavailableSpellIds: pers.persSpells.map((spell) => spell.spellId),
  });
}

export async function loadLevelUpFeatSpellGrowthOffer(persId: number): Promise<FeatSpellGrowthOffer | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  const userId = await findUserIdByEmail(session.user.email);
  if (userId === null || !(await canEditPers(persId, userId))) return null;

  const pers = await prisma.pers.findUnique({ where: { persId }, select: { ruleset: true, level: true, persSpells: { select: { spellId: true } } } });
  if (!pers || pers.level >= 20) return null;

  return loadFeatSpellGrowthOffer(prisma, {
    persId,
    ruleset: pers.ruleset as RulesetId,
    characterLevel: pers.level + 1,
    unavailableSpellIds: pers.persSpells.map((spell) => spell.spellId),
  });
}

export type LevelUpSpellOfferInput = {
  classId: number;
  subclassId: number | null;
  classChoiceOptionIds: readonly number[];
  /** Рід джина обирається тим самим підвищенням, що й заклинання (O43), — фільтр роду мусить його бачити. */
  subclassChoiceOptionIds?: readonly number[];
};

export async function loadPersLevelUpSpellOffer(persId: number, input: LevelUpSpellOfferInput): Promise<ClassSpellOffer | null> {
  const pers = await prisma.pers.findUnique({
    where: { persId },
    select: {
      level: true,
      classId: true,
      subclassId: true,
      multiclasses: { select: { classId: true, classLevel: true, subclassId: true } },
      choiceOptions: { select: { choiceOptionId: true } },
    },
  });
  if (!pers) return null;

  const multiclass = pers.multiclasses.find((row) => row.classId === input.classId);
  const mainClassLevel = pers.level - pers.multiclasses.reduce((sum, row) => sum + row.classLevel, 0);
  const classLevelBefore = input.classId === pers.classId ? mainClassLevel : multiclass?.classLevel ?? 0;
  const existingSubclassId = input.classId === pers.classId ? pers.subclassId : multiclass?.subclassId ?? null;

  return loadClassSpellOffer(prisma, {
    classId: input.classId,
    classLevel: classLevelBefore + 1,
    subclassId: input.subclassId ?? existingSubclassId ?? null,
    chosenClassOptionIds: [
      ...pers.choiceOptions.map((option) => option.choiceOptionId),
      ...input.classChoiceOptionIds,
      ...(input.subclassChoiceOptionIds ?? []),
    ],
    persId,
  });
}

export async function executeLevelUp(persId: number, data: LevelUpInput) {
  try {
    const accessError = await findLevelUpAccessError(persId);
    if (accessError) return accessError;

    await moveToCurrentPresetRevision(persId);
    const outcome = await executeLevelUpStep(createStandaloneLevelUpExecutor(), persId, data);
    if ("error" in outcome) return outcome;

    captureServerPostHogEvent("character_leveled_up", { pers_id: persId, edition: outcome.ruleset === "RULES_2024" ? "2024" : "2014", level: outcome.level });
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: "Failed to level up" };
  }
}

