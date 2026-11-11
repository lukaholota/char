import { Prisma, type Ability, type RestType, type SkillProficiencyType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { FeatureUseDirection } from "@/lib/offline/operations";
import {
  MAX_CUSTOM_FEATURES,
  MAX_CUSTOM_SKILLS,
  findCustomRestTypes,
  findUsesRemainingAfterEdit,
  type CustomFeatureInput,
  type CustomFeatureRest,
  type CustomSkillInput,
} from "@/rules/pers-custom-content";

export type CustomSaveFailure = { success: false; error: string };

const DUPLICATE_SKILL_ERROR = "Навичка з такою назвою вже є.";

export function listCustomSkills(persId: number) {
  return prisma.persCustomSkill.findMany({ where: { persId }, orderBy: { name: "asc" } });
}

export function listCustomFeatures(persId: number) {
  return prisma.persCustomFeature.findMany({ where: { persId }, orderBy: { id: "asc" } });
}

export async function saveCustomSkill(persId: number, skillId: number | null, input: CustomSkillInput): Promise<CustomSaveFailure | null> {
  const data = { name: input.name, ability: input.ability as Ability, proficiencyType: input.proficiencyType as SkillProficiencyType, bonus: input.bonus };
  try {
    if (skillId !== null) return (await prisma.persCustomSkill.updateMany({ where: { id: skillId, persId }, data })).count ? null : { success: false, error: "Навичку не знайдено." };
    if ((await prisma.persCustomSkill.count({ where: { persId } })) >= MAX_CUSTOM_SKILLS) return { success: false, error: `Можна додати до ${MAX_CUSTOM_SKILLS} навичок.` };
    await prisma.persCustomSkill.create({ data: { ...data, persId } });
    return null;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { success: false, error: DUPLICATE_SKILL_ERROR };
    throw error;
  }
}

export async function deleteCustomSkill(persId: number, skillId: number): Promise<void> {
  await prisma.persCustomSkill.deleteMany({ where: { id: skillId, persId } });
}

export async function saveCustomFeature(persId: number, featureId: number | null, input: CustomFeatureInput): Promise<CustomSaveFailure | null> {
  const data = { ...input, restoredOn: input.restoredOn as RestType | null };
  if (featureId === null) {
    if ((await prisma.persCustomFeature.count({ where: { persId } })) >= MAX_CUSTOM_FEATURES) return { success: false, error: `Можна додати до ${MAX_CUSTOM_FEATURES} здібностей.` };
    await prisma.persCustomFeature.create({ data: { ...data, persId, usesRemaining: input.usesMax } });
    return null;
  }
  const previous = await prisma.persCustomFeature.findFirst({ where: { id: featureId, persId }, select: { usesMax: true, usesRemaining: true } });
  if (!previous) return { success: false, error: "Здібність не знайдено." };
  await prisma.persCustomFeature.update({ where: { id: featureId }, data: { ...data, usesRemaining: findUsesRemainingAfterEdit(previous, input.usesMax) } });
  return null;
}

export async function deleteCustomFeature(persId: number, featureId: number): Promise<void> {
  await prisma.persCustomFeature.deleteMany({ where: { id: featureId, persId } });
}

/// Умова на рядку, а не читання перед записом: два швидкі натискання не виходять за межі.
export async function stepCustomFeatureUses(persId: number, featureId: number, direction: FeatureUseDirection, amount = 1): Promise<void> {
  if (direction === "spend") {
    await prisma.persCustomFeature.updateMany({ where: { id: featureId, persId, usesRemaining: { gte: amount } }, data: { usesRemaining: { decrement: amount } } });
    return;
  }
  await prisma.$executeRaw`
    UPDATE public.pers_custom_feature SET uses_remaining = LEAST(uses_max, uses_remaining + ${amount})
    WHERE pers_custom_feature_id = ${featureId} AND pers_id = ${persId} AND uses_remaining < uses_max`;
}

export function restoreCustomFeatureUses(persId: number, rest: CustomFeatureRest): Promise<number> {
  return prisma.$executeRaw`
    UPDATE public.pers_custom_feature SET uses_remaining = uses_max
    WHERE pers_id = ${persId} AND restored_on::text = ANY(${findCustomRestTypes(rest)}) AND uses_remaining < uses_max`;
}
