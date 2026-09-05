/**
 * KR18.3 — бойовий стиль 2024 як риса, а не окреме поле.
 *
 * PHB 2024 каже про Воїна, Паладина й Рейнджера одне й те саме: «You gain a Fighting Style feat
 * of your choice». Тому право на вибір їде з даних класу (`ClassChoiceOption` на потрібному
 * рівні), а не з `if` по назві класу, і сам вибір веде до риси категорії FIGHTING_STYLE.
 *
 * Опція зчіплюється з рисою через спільну `Feature`: опція дає фічу
 * (`ChoiceOptionFeature`), і та сама фіча висить на рисі (`Feat.grantsFeature`). Це наявні
 * звʼязки — жодного нового стовпця й жодного зіставлення за назвою.
 */

import { Feats, FeatureDisplayType, PrismaClient, Ruleset } from "@prisma/client";
import { featTranslations } from "../../src/lib/refs/translation";
import {
  CHOICE_GROUPS_2024,
  linkChoiceOptionFeature,
  linkClassChoiceOption,
  upsertChoiceOption2024,
} from "./helpers/choiceOptions2024";

const RULESET: Ruleset = "RULES_2024";

/** Рівень, на якому клас 2024 дає бойовий стиль. Воїн — на 1-му, Паладин і Рейнджер — на 2-му. */
const FIGHTING_STYLE_LEVEL_BY_CLASS: Record<string, number> = {
  FIGHTER_2024: 1,
  PALADIN_2024: 2,
  RANGER_2024: 2,
};

export const seedFightingStyles2024 = async (prisma: PrismaClient) => {
  console.log("🛡️ Бойові стилі 2024 як риси…");

  const styleFeats = await prisma.feat.findMany({
    where: { ruleset: RULESET, category: "FIGHTING_STYLE" },
    select: { featId: true, name: true, engName: true, description: true, shortDescription: true },
    orderBy: { engName: "asc" },
  });

  if (styleFeats.length === 0) {
    console.warn("  ⚠️ Рис категорії FIGHTING_STYLE (2024) немає — спершу запусти seedFeats2024");
    return;
  }

  const choiceOptionIds: number[] = [];
  for (const feat of styleFeats) {
    const feature = await upsertFightingStyleFeature(prisma, feat);
    await prisma.feat.update({
      where: { featId: feat.featId },
      data: { grantsFeature: { connect: { featureId: feature.featureId } } },
    });

    const option = await upsertChoiceOption2024(prisma, {
      groupName: CHOICE_GROUPS_2024.FIGHTING_STYLE,
      optionName: readUkrainianName(feat),
      optionNameEng: `Fighting Style 2024 (${feat.engName})`,
    });
    await linkChoiceOptionFeature(prisma, option.choiceOptionId, feature.featureId);
    choiceOptionIds.push(option.choiceOptionId);
  }

  await offerStylesToClasses(prisma, choiceOptionIds);
  console.log(`  • ${styleFeats.length} стилів доступні Воїну, Паладину й Рейнджеру`);
};

type StyleFeat = {
  name: Feats;
  engName: string;
  description: string;
  shortDescription: string;
};

async function upsertFightingStyleFeature(prisma: PrismaClient, feat: StyleFeat) {
  const engName = `Fighting Style: ${feat.engName} (2024)`;
  const data = {
    name: readUkrainianName(feat),
    description: feat.description,
    shortDescription: feat.shortDescription,
    displayType: [FeatureDisplayType.PASSIVE],
    ruleset: RULESET,
  };

  return prisma.feature.upsert({ where: { engName }, update: data, create: { ...data, engName } });
}

/** `Feat.name` — enum-ключ (ARCHERY); людська назва лежить у перекладах, а не в базі. */
function readUkrainianName(feat: StyleFeat): string {
  return featTranslations[feat.name] ?? feat.engName;
}

async function offerStylesToClasses(prisma: PrismaClient, choiceOptionIds: number[]) {
  for (const [className, level] of Object.entries(FIGHTING_STYLE_LEVEL_BY_CLASS)) {
    const characterClass = await prisma.class.findFirst({
      where: { ruleset: RULESET, name: className as never },
      select: { classId: true },
    });
    if (!characterClass) {
      console.warn(`  ⚠️ Класу ${className} немає в базі`);
      continue;
    }

    for (const choiceOptionId of choiceOptionIds) {
      await linkClassChoiceOption(prisma, { classId: characterClass.classId, choiceOptionId, levelsGranted: [level] });
    }
  }
}
