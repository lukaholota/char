/**
 * `ChoiceOption.optionNameEng` унікальний на всю базу, тому опції 2024 несуть у ньому редакцію.
 * Підписи груп зібрані з ратифікованих термінів `dictionary.json` — нових тут не заводиться.
 */

import { Ability, ChoiceOptionEffectKind, Prisma, PrismaClient, Ruleset, Skills } from "@prisma/client";

const RULESET: Ruleset = "RULES_2024";

export const CHOICE_GROUPS_2024 = {
  ABILITY: "Характеристика",
  PROFICIENCY: "Володіння",
  SPELL_LIST: "Список заклинань",
  FIGHTING_STYLE: "Бойовий стиль",
} as const;

type ChoiceOption2024 = {
  groupName: string;
  optionName: string;
  optionNameEng: string;
  effectKind?: keyof typeof ChoiceOptionEffectKind;
  effectAbility?: Ability;
  effectSkill?: Skills;
  effectAmount?: number;
  /** `{level?, pact?}` — те саме поле, яке вже читає `checkInvocationPrerequisite` (KR18.8). */
  prerequisites?: Prisma.InputJsonValue;
};

export async function upsertChoiceOption2024(prisma: PrismaClient, option: ChoiceOption2024) {
  const data = {
    groupName: option.groupName,
    optionName: option.optionName,
    ruleset: RULESET,
    effectKind: option.effectKind ?? null,
    effectAbility: option.effectAbility ?? null,
    effectSkill: option.effectSkill ?? null,
    effectAmount: option.effectAmount ?? null,
    prerequisites: option.prerequisites ?? Prisma.JsonNull,
  };

  return prisma.choiceOption.upsert({
    where: { optionNameEng: option.optionNameEng },
    update: data,
    create: { ...data, optionNameEng: option.optionNameEng },
  });
}

export async function linkFeatChoiceOption(prisma: PrismaClient, featId: number, choiceOptionId: number) {
  await prisma.featChoiceOption.upsert({
    where: { unique_feat_choice: { featId, choiceOptionId } },
    update: { ruleset: RULESET },
    create: { featId, choiceOptionId, ruleset: RULESET },
  });
}

export async function linkChoiceOptionFeature(prisma: PrismaClient, choiceOptionId: number, featureId: number) {
  const existing = await prisma.choiceOptionFeature.findFirst({ where: { choiceOptionId, featureId } });
  if (existing) return;
  await prisma.choiceOptionFeature.create({ data: { choiceOptionId, featureId, ruleset: RULESET } });
}

export async function linkClassChoiceOption(
  prisma: PrismaClient,
  args: { classId: number; choiceOptionId: number; levelsGranted: number[] },
) {
  await prisma.classChoiceOption.upsert({
    where: { unique_class_choice: { classId: args.classId, choiceOptionId: args.choiceOptionId } },
    update: { levelsGranted: args.levelsGranted, ruleset: RULESET },
    create: {
      classId: args.classId,
      choiceOptionId: args.choiceOptionId,
      levelsGranted: args.levelsGranted,
      ruleset: RULESET,
    },
  });
}
