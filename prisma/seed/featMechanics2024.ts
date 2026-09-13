/**
 * KR18.3 — механіка рис 2024.
 *
 * `featSeed2024` завозить 75 рис як текст: назву, категорію, опис. Передумов, підвищень
 * характеристик і вкладених виборів у них немає, тому риса нічого не робить із персонажем.
 * Цей сід дописує саме механіку — і бере її з `data/2024/normalized/feats.json`, а не з
 * окремої таблиці, написаної руками.
 */

import {
  Ability,
  ArmorType,
  FeatureDisplayType,
  Prisma,
  PrismaClient,
  RestType,
  Ruleset,
  Skills,
  ToolCategory,
  WeaponCategory,
  WeaponType,
} from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  attributesUkrFull,
  classTranslations,
  damageTypeTranslations,
  engEnumSkills,
} from "../../src/lib/refs/translation";
import {
  buildGrantedAbilityScoreIncrease,
  findAbilityIncreaseOptions,
  findFeatPrerequisites,
  type AbilityCode,
} from "./helpers/featMechanics2024";
import {
  CHOICE_GROUPS_2024,
  linkChoiceOptionFeature,
  linkFeatChoiceOption,
  upsertChoiceOption2024,
} from "./helpers/choiceOptions2024";

const RULESET: Ruleset = "RULES_2024";

/** Magic Initiate 2024: замовляння й заклинання 1-го рівня беруться з одного списку на вибір. */
const MAGIC_INITIATE_SPELL_LISTS = [
  { engName: "Cleric", classKey: "CLERIC_2024", genitive: "клірика" },
  { engName: "Druid", classKey: "DRUID_2024", genitive: "друїда" },
  { engName: "Wizard", classKey: "WIZARD_2024", genitive: "чарівника" },
] as const satisfies ReadonlyArray<{ engName: string; classKey: keyof typeof classTranslations; genitive: string }>;

type MagicInitiateSpellList = (typeof MAGIC_INITIATE_SPELL_LISTS)[number];

const SKILLED_PICK_COUNT = 3;
const SKILL_EXPERT_PICK_COUNT = 1;

/**
 * KR31.4 — володіння від рис 2024. Рушій ці три колонки вже читає й при створенні
 * (`character-creation.ts`), і при підвищенні (`levelup-persistence.ts`), тому риса стає робочою
 * від самих даних. Форма — та, яку читає код: масив enum-значень, а не обʼєкт-лічильник.
 *
 * Джерело кожного рядка — `data/2024/source/raw/feat/<риса>.html`. Редакції розходяться: у 2024
 * щити дає Lightly Armored, а не Moderately Armored, як у 2014.
 */
const FEAT_PROFICIENCY_GRANTS_2024: Readonly<Record<string, {
  armor?: ArmorType[];
  weapons?: { category?: WeaponCategory[]; type?: WeaponType[] };
  tools?: ToolCategory[];
}>> = {
  // «You gain training with Light armor and Shields.»
  LIGHTLY_ARMORED: { armor: ["LIGHT", "SHIELD"] },
  // «You gain training with Medium armor.»
  MODERATELY_ARMORED: { armor: ["MEDIUM"] },
  // «You gain training with Heavy armor.»
  HEAVILY_ARMORED: { armor: ["HEAVY"] },
  // «You gain proficiency with Martial weapons.»
  MARTIAL_WEAPON_TRAINING: { weapons: { type: ["MARTIAL_WEAPON"] } },
  // «You gain proficiency with Cook's Utensils if you don't already have it.»
  CHEF: { tools: ["COOKS_UTENSILS"] },
  // «You gain proficiency with the Poisoner's Kit.»
  POISONER: { tools: ["POISONERS_KIT"] },
};

/** «Choose one of the following damage types: Acid, Cold, Fire, Lightning, or Thunder.» */
const ELEMENTAL_ADEPT_DAMAGE_TYPES = ["ACID", "COLD", "FIRE", "LIGHTNING", "THUNDER"] as const;

type Feat2024Source = {
  engName: string;
  prerequisite?: string | null;
  benefitsEng?: Array<{ name?: string | null; description?: string | null }> | null;
};

export const seedFeatMechanics2024 = async (prisma: PrismaClient) => {
  console.log("🎯 Механіка рис 2024: передумови, підвищення характеристик, вкладені вибори…");

  const feats = readFeats2024();
  const abilityChoicesByFeat = await applyFeatMechanics(prisma, feats);

  await seedAbilityChoiceOptions(prisma, abilityChoicesByFeat);
  await seedSkilledChoiceOptions(prisma);
  await seedSkillExpertChoiceOptions(prisma);
  await seedElementalAdeptChoiceOptions(prisma);
  await seedMagicInitiateChoiceOptions(prisma);

  console.log("✅ Механіка рис 2024 на місці");
};

function readFeats2024(): Feat2024Source[] {
  return JSON.parse(readFileSync(join(process.cwd(), "data/2024/normalized/feats.json"), "utf-8"));
}

async function applyFeatMechanics(
  prisma: PrismaClient,
  feats: Feat2024Source[],
): Promise<Map<string, AbilityCode[]>> {
  const abilityChoicesByFeat = new Map<string, AbilityCode[]>();
  let updated = 0;

  for (const feat of feats) {
    const stored = await prisma.feat.findFirst({
      where: { ruleset: RULESET, engName: feat.engName },
      select: { featId: true, name: true },
    });
    if (!stored) {
      console.warn(`  ⚠️ Риси "${feat.engName}" немає в базі — спершу запусти seedFeats2024`);
      continue;
    }

    const prerequisites = findFeatPrerequisites(feat.prerequisite);
    const abilityOptions = findAbilityIncreaseOptions(feat.benefitsEng);

    await prisma.feat.update({
      where: { featId: stored.featId },
      data: {
        prerequisiteLevel: prerequisites.level,
        prerequisiteAbilityScore: prerequisites.abilityScore ?? undefined,
        prerequisiteProficiency: prerequisites.proficiency ?? undefined,
        prerequisiteSpellcasting: prerequisites.spellcasting,
        grantedASI: buildGrantedAbilityScoreIncrease(abilityOptions) ?? undefined,
        ...(stored.name === "SKILLED" ? { grantedSkillCount: SKILLED_PICK_COUNT } : {}),
        ...(stored.name === "SKILL_EXPERT" ? { grantedSkillCount: SKILL_EXPERT_PICK_COUNT } : {}),
        ...buildProficiencyGrants(stored.name),
      },
    });
    updated++;

    // Фіксоване підвищення застосовується з grantedASI; вибір із кількох потребує опцій.
    if (abilityOptions.length > 1) abilityChoicesByFeat.set(feat.engName, abilityOptions);
  }

  console.log(`  • ${updated} рис оновлено, з них ${abilityChoicesByFeat.size} із вибором характеристики`);
  return abilityChoicesByFeat;
}

/** Риса без рядка в таблиці однаково переписує колонки — інакше знята видача лишилась би в базі. */
function buildProficiencyGrants(featName: string) {
  const grants = FEAT_PROFICIENCY_GRANTS_2024[featName];

  return {
    grantedArmorProficiencies: grants?.armor ?? [],
    grantedWeaponProficiencies: grants?.weapons ?? Prisma.DbNull,
    grantedToolProficiencies: grants?.tools ?? Prisma.DbNull,
  };
}

async function seedAbilityChoiceOptions(prisma: PrismaClient, abilityChoicesByFeat: Map<string, AbilityCode[]>) {
  for (const [engName, abilities] of abilityChoicesByFeat) {
    const feat = await prisma.feat.findFirstOrThrow({ where: { ruleset: RULESET, engName }, select: { featId: true } });

    for (const ability of abilities) {
      const option = await upsertChoiceOption2024(prisma, {
        groupName: CHOICE_GROUPS_2024.ABILITY,
        optionName: attributesUkrFull[ability],
        optionNameEng: `${engName} 2024 (${ability})`,
        effectKind: "ASI",
        effectAbility: ability as Ability,
        effectAmount: 1,
      });
      await linkFeatChoiceOption(prisma, feat.featId, option.choiceOptionId);
    }
  }
}

/**
 * Skill Expert 2024 — дві окремі групи по 18 навичок, як у тієї самої риси 2014: одна дає
 * володіння, друга експертизу. Обидва `effectKind` рушій уже застосовує при створенні
 * (`character-creation.ts`) і при підвищенні (`levelup-persistence.ts`).
 */
async function seedSkillExpertChoiceOptions(prisma: PrismaClient) {
  const skillExpert = await prisma.feat.findFirst({
    where: { ruleset: RULESET, name: "SKILL_EXPERT" },
    select: { featId: true },
  });
  if (!skillExpert) return console.warn("  ⚠️ Риси SKILL_EXPERT (2024) немає в базі");

  for (const skill of Object.values(Skills)) {
    const skillName = readUkrainianSkillName(skill);

    for (const grant of [
      { group: CHOICE_GROUPS_2024.PROFICIENCY, kind: "SKILL_PROFICIENCY", key: "proficiency" },
      { group: CHOICE_GROUPS_2024.EXPERTISE, kind: "SKILL_EXPERTISE", key: "expertise" },
    ] as const) {
      const option = await upsertChoiceOption2024(prisma, {
        groupName: grant.group,
        optionName: skillName,
        optionNameEng: `Skill Expert 2024 ${grant.key} (${skill})`,
        effectKind: grant.kind,
        effectSkill: skill,
      });
      await linkFeatChoiceOption(prisma, skillExpert.featId, option.choiceOptionId);
    }
  }
  console.log(`  • Експерт у навичках: володіння й експертиза, по ${Object.values(Skills).length} навичок`);
}

/**
 * Elemental Adept 2024 — тип шкоди як вибір. Без нього `findFeatRepeatProblem` не має чим
 * розрізнити копії риси, і книжкове «must choose a different damage type each time» не тримається.
 */
async function seedElementalAdeptChoiceOptions(prisma: PrismaClient) {
  const elementalAdept = await prisma.feat.findFirst({
    where: { ruleset: RULESET, name: "ELEMENTAL_ADEPT" },
    select: { featId: true },
  });
  if (!elementalAdept) return console.warn("  ⚠️ Риси ELEMENTAL_ADEPT (2024) немає в базі");

  for (const damageType of ELEMENTAL_ADEPT_DAMAGE_TYPES) {
    const option = await upsertChoiceOption2024(prisma, {
      groupName: CHOICE_GROUPS_2024.DAMAGE_TYPE,
      optionName: damageTypeTranslations[damageType],
      optionNameEng: `Elemental Adept 2024 (${damageType})`,
    });
    await linkFeatChoiceOption(prisma, elementalAdept.featId, option.choiceOptionId);
  }
  console.log(`  • Адепт стихій: ${ELEMENTAL_ADEPT_DAMAGE_TYPES.length} типів шкоди`);
}

function readUkrainianSkillName(skill: Skills): string {
  return engEnumSkills.find((entry) => entry.eng === skill)?.ukr ?? skill;
}

async function seedSkilledChoiceOptions(prisma: PrismaClient) {
  const skilled = await prisma.feat.findFirst({ where: { ruleset: RULESET, name: "SKILLED" }, select: { featId: true } });
  if (!skilled) return console.warn("  ⚠️ Риси SKILLED (2024) немає в базі");

  for (const skill of Object.values(Skills)) {
    const option = await upsertChoiceOption2024(prisma, {
      groupName: CHOICE_GROUPS_2024.PROFICIENCY,
      optionName: engEnumSkills.find((entry) => entry.eng === skill)?.ukr ?? skill,
      optionNameEng: `Skilled 2024 (${skill})`,
      effectKind: "SKILL_PROFICIENCY",
      effectSkill: skill,
    });
    await linkFeatChoiceOption(prisma, skilled.featId, option.choiceOptionId);
  }
  console.log(`  • Умілець: ${Object.values(Skills).length} навичок, обрати ${SKILLED_PICK_COUNT}`);
}

async function seedMagicInitiateChoiceOptions(prisma: PrismaClient) {
  const magicInitiate = await prisma.feat.findFirst({
    where: { ruleset: RULESET, name: "MAGIC_INITIATE" },
    select: { featId: true },
  });
  if (!magicInitiate) return console.warn("  ⚠️ Риси MAGIC_INITIATE (2024) немає в базі");

  for (const spellList of MAGIC_INITIATE_SPELL_LISTS) {
    // Заклинання гравець обирає сам зі списку; опція каже лише, який це список і чим він
    // чаклується — саме `effectAbility` робить рису окремим джерелом заклинань (KR18.4).
    const feature = await upsertSpellListFeature(prisma, spellList);
    const option = await upsertChoiceOption2024(prisma, {
      groupName: CHOICE_GROUPS_2024.SPELL_LIST,
      optionName: classTranslations[spellList.classKey],
      optionNameEng: `Magic Initiate 2024 (${spellList.engName})`,
      effectAbility: await findCastingAbility(prisma, spellList.classKey),
    });
    await linkFeatChoiceOption(prisma, magicInitiate.featId, option.choiceOptionId);
    await linkChoiceOptionFeature(prisma, option.choiceOptionId, feature.featureId);
  }
  console.log(`  • Посвячений у магію: ${MAGIC_INITIATE_SPELL_LISTS.length} списки заклинань`);
}

/** Характеристику списку не пишемо руками — вона вже стоїть на самому класі. */
async function findCastingAbility(prisma: PrismaClient, classKey: string) {
  const characterClass = await prisma.class.findFirst({
    where: { ruleset: RULESET, name: classKey as never },
    select: { primaryCastingStat: true },
  });

  return characterClass?.primaryCastingStat ?? undefined;
}

async function upsertSpellListFeature(prisma: PrismaClient, spellList: MagicInitiateSpellList) {
  const engName = `Magic Initiate: ${spellList.engName} list (2024)`;
  const data = {
    name: `Посвячений у магію: список ${spellList.genitive}`,
    description:
      `Ви обрали список заклинань ${spellList.genitive}. Обидва замовляння й заклинання 1-го рівня ` +
      "від риси Посвячений у магію беруться саме з нього. Заклинання 1-го рівня завжди підготоване; " +
      "раз на довгий відпочинок його можна накласти без слоту — це і є одне використання цієї риси.",
    shortDescription: `Заклинання риси беруться зі списку ${spellList.genitive}.`,
    displayType: [FeatureDisplayType.PASSIVE],
    // Р38: безкоштовне застосування заклинання 1-го рівня раз на довгий відпочинок — це
    // використання фічі, а не другий рядок заклинання. Дві риси — два списки — два лічильники.
    limitedUsesPer: RestType.LONG_REST,
    usesCount: 1,
    ruleset: RULESET,
  };

  return prisma.feature.upsert({ where: { engName }, update: data, create: { ...data, engName } });
}
