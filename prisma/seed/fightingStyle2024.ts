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
  BLOOD_HUNTER_2024: 2,
};

type FightingStyleMechanics = {
  bonusToRangedAttackRoll?: number;
  givesAC?: number;
  requiresArmorForACBonus?: boolean;
  bonusToMeleeOneHandedWeaponDamage?: number;
  bonusToThrownDamage?: number;
  unarmedDamage?: string;
  modifiesUnarmed?: boolean;
};

/**
 * KR31.4 — числа бойових стилів 2024 у тих самих колонках `Feature`, які вже читає
 * `bonus-calculator` для стилів 2014. Джерело — `data/2024/source/raw/feat/*.html` (PHB 2024);
 * Archery і Defense є ще й у `data/2024/srd/feats.md`, і формулювання там те саме.
 *
 * Пʼять стилів тут відсутні свідомо: Blind Fighting (сліпозір 10 футів), Great Weapon Fighting
 * (перекид 1 і 2 на кубі шкоди), Interception і Protection (реакції) і Two Weapon Fighting
 * (модифікатор до шкоди додаткової атаки) не мають числа, яке лист рахує, — жодної колонки під
 * них у `feature` не існує. Вони лишаються прозою, і це межа, а не пропуск.
 */
export const FIGHTING_STYLE_MECHANICS_2024: Readonly<Record<string, FightingStyleMechanics>> = {
  // «You gain a +2 bonus to attack rolls you make with Ranged weapons.»
  Archery: { bonusToRangedAttackRoll: 2 },
  // «While you're wearing Light, Medium, or Heavy armor, you gain a +1 bonus to Armor Class.»
  Defense: { givesAC: 1, requiresArmorForACBonus: true },
  // «When you're holding a Melee weapon in one hand and no other weapons, you gain a +2 bonus to damage rolls.»
  Dueling: { bonusToMeleeOneHandedWeaponDamage: 2 },
  // «When you hit with a ranged attack roll using a weapon that has the Thrown property, you gain a +2 bonus to the damage roll.»
  "Thrown Weapon Fighting": { bonusToThrownDamage: 2 },
  // «…deal Bludgeoning damage equal to 1d6 … If you aren't holding any weapons or a Shield … the d6 becomes a d8.»
  "Unarmed Fighting": { unarmedDamage: "1к6 / 1к8", modifiesUnarmed: true },
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
    ...readMechanics(feat.engName),
  };

  return prisma.feature.upsert({ where: { engName }, update: data, create: { ...data, engName } });
}

/**
 * Кожна механічна колонка виставляється явно — і в стилях без механіки теж, у `null`. Інакше
 * повторний прогін після правки таблиці лишив би в базі старе число, якого вже ніде немає.
 */
function readMechanics(engName: string) {
  const mechanics = FIGHTING_STYLE_MECHANICS_2024[engName] ?? {};

  return {
    bonusToRangedAttackRoll: mechanics.bonusToRangedAttackRoll ?? null,
    givesAC: mechanics.givesAC ?? null,
    requiresArmorForACBonus: mechanics.requiresArmorForACBonus ?? null,
    bonusToMeleeOneHandedWeaponDamage: mechanics.bonusToMeleeOneHandedWeaponDamage ?? null,
    bonusToThrownDamage: mechanics.bonusToThrownDamage ?? null,
    unarmedDamage: mechanics.unarmedDamage ?? null,
    modifiesUnarmed: mechanics.modifiesUnarmed ?? null,
  };
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
