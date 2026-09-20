import { Ability, ChoiceOptionEffectKind, DamageType, Feats, PrismaClient, Skills } from "@prisma/client";
import { attributesUkrFull, skillTranslations } from "../../src/lib/refs/translation";

/// Одна група вибору на рису 2014, і те, що дає опція, лежить у колонках `effect_*`, а не в
/// англійській назві (BUG-004, BUG-005 у docs/KNOWN-BUGS.md). Назви й групи — ті, що вже
/// носять гравці в робочій базі: їх вибрано 1 300+ разів, дублікати з «(здібність)» — жодного.

export type FeatChoiceOption2014 = {
  feat: Feats;
  groupName: string;
  optionName: string;
  optionNameEng: string;
  effectKind: ChoiceOptionEffectKind | null;
  effectAbility: Ability | null;
  effectSkill: Skills | null;
  effectAmount: number | null;
};

const ABILITY_ENGLISH_NAMES: Record<Ability, string> = {
  STR: "Strength",
  DEX: "Dexterity",
  CON: "Constitution",
  INT: "Intelligence",
  WIS: "Wisdom",
  CHA: "Charisma",
};

const HALF_FEAT_ABILITIES: ReadonlyArray<readonly [Feats, Ability[]]> = [
  [Feats.ATHLETE, [Ability.STR, Ability.DEX]],
  [Feats.LIGHTLY_ARMORED, [Ability.STR, Ability.DEX]],
  [Feats.MODERATELY_ARMORED, [Ability.STR, Ability.DEX]],
  [Feats.OBSERVANT, [Ability.INT, Ability.WIS]],
  [Feats.TAVERN_BRAWLER, [Ability.STR, Ability.CON]],
  [Feats.WEAPON_MASTER, [Ability.STR, Ability.DEX]],
  [Feats.DRAGON_FEAR, [Ability.STR, Ability.CON, Ability.CHA]],
  [Feats.DRAGON_HIDE, [Ability.STR, Ability.CON, Ability.CHA]],
  [Feats.ELVEN_ACCURACY, [Ability.DEX, Ability.INT, Ability.WIS, Ability.CHA]],
  [Feats.FADE_AWAY, [Ability.DEX, Ability.INT]],
  [Feats.FLAMES_OF_PHLEGETHOS, [Ability.INT, Ability.CHA]],
  [Feats.ORCISH_FURY, [Ability.STR, Ability.CON]],
  [Feats.SECOND_CHANCE, [Ability.DEX, Ability.CON, Ability.CHA]],
  [Feats.SQUAT_NIMBLENESS, [Ability.STR, Ability.DEX]],
  [Feats.CHEF, [Ability.CON, Ability.WIS]],
  [Feats.CRUSHER, [Ability.STR, Ability.CON]],
  [Feats.PIERCER, [Ability.STR, Ability.DEX]],
  [Feats.SLASHER, [Ability.STR, Ability.DEX]],
  [Feats.TELEKINETIC, [Ability.INT, Ability.WIS, Ability.CHA]],
  [Feats.TELEPATHIC, [Ability.INT, Ability.WIS, Ability.CHA]],
  [Feats.GIFT_OF_THE_GEM_DRAGON, [Ability.INT, Ability.WIS, Ability.CHA]],
  [Feats.EMBER_OF_GIANTS, [Ability.STR, Ability.CON, Ability.WIS]],
  [Feats.FURY_OF_GIANTS, [Ability.STR, Ability.CON, Ability.WIS]],
  [Feats.GUILE_OF_GIANTS, [Ability.STR, Ability.CON, Ability.WIS]],
  [Feats.KEENNESS_OF_GIANTS, [Ability.STR, Ability.CON, Ability.WIS]],
  [Feats.SOUL_OF_GIANTS, [Ability.STR, Ability.CON, Ability.WIS]],
  [Feats.VIGOR_OF_GIANTS, [Ability.STR, Ability.CON, Ability.WIS]],
  [Feats.FEY_TOUCHED, [Ability.INT, Ability.WIS, Ability.CHA]],
  [Feats.SHADOW_TOUCHED, [Ability.INT, Ability.WIS, Ability.CHA]],
];

const ELEMENTAL_ADEPT_ELEMENTS: ReadonlyArray<readonly [DamageType, string, string]> = [
  [DamageType.ACID, "Acid", "Кислота"],
  [DamageType.COLD, "Cold", "Холод"],
  [DamageType.FIRE, "Fire", "Вогонь"],
  [DamageType.LIGHTNING, "Lightning", "Блискавка"],
  [DamageType.THUNDER, "Thunder", "Грім"],
];

const NO_EFFECT = { effectKind: null, effectAbility: null, effectSkill: null, effectAmount: null } as const;

export function buildFeatChoiceOptions2014(): FeatChoiceOption2014[] {
  return [
    ...buildResilientOptions(),
    ...buildElementalAdeptOptions(),
    ...buildProdigyOptions(),
    ...HALF_FEAT_ABILITIES.flatMap(([feat, abilities]) => buildHalfFeatOptions(feat, abilities)),
  ];
}

function buildResilientOptions(): FeatChoiceOption2014[] {
  return Object.values(Ability).map((ability) => ({
    feat: Feats.RESILIENT,
    groupName: "Характеристика для Стійкості",
    optionName: attributesUkrFull[ability],
    optionNameEng: `Resilient (${ABILITY_ENGLISH_NAMES[ability]})`,
    ...abilityIncrease(ability),
  }));
}

// Опір до типів шкоди застосунок не рахує, тож стихія лише записується й показується.
function buildElementalAdeptOptions(): FeatChoiceOption2014[] {
  return ELEMENTAL_ADEPT_ELEMENTS.map(([, englishName, ukrainianName]) => ({
    feat: Feats.ELEMENTAL_ADEPT,
    groupName: "Стихія Адепта",
    optionName: ukrainianName,
    optionNameEng: `Elemental Adept (${englishName})`,
    ...NO_EFFECT,
  }));
}

function buildProdigyOptions(): FeatChoiceOption2014[] {
  const skills = Object.values(Skills);
  const buildSkillOption = (skill: Skills, effectKind: ChoiceOptionEffectKind, groupName: string, label: string) => ({
    feat: Feats.PRODIGY,
    groupName,
    optionName: skillTranslations[skill],
    optionNameEng: `Prodigy ${label} (${skill})`,
    effectKind,
    effectAbility: null,
    effectSkill: skill,
    effectAmount: 1,
  });

  return [
    ...skills.map((skill) => buildSkillOption(skill, ChoiceOptionEffectKind.SKILL_PROFICIENCY, "Навичка Вундеркінда", "Proficiency")),
    ...skills.map((skill) => buildSkillOption(skill, ChoiceOptionEffectKind.SKILL_EXPERTISE, "Експертиза Вундеркінда", "Expertise")),
  ];
}

function buildHalfFeatOptions(feat: Feats, abilities: Ability[]): FeatChoiceOption2014[] {
  return abilities.map((ability) => ({
    feat,
    groupName: `Характеристика ${feat}`,
    optionName: attributesUkrFull[ability],
    optionNameEng: `${feat} Ability (${ABILITY_ENGLISH_NAMES[ability]})`,
    ...abilityIncrease(ability),
  }));
}

function abilityIncrease(ability: Ability) {
  return { effectKind: ChoiceOptionEffectKind.ASI, effectAbility: ability, effectSkill: null, effectAmount: 1 };
}

export type FeatChoiceOptionDrift = {
  missing: FeatChoiceOption2014[];
  unlinked: FeatChoiceOption2014[];
  staleTexts: Array<{ optionNameEng: string; field: "groupName" | "optionName"; database: string; seed: string }>;
  staleEffects: Array<{ choiceOptionId: number; option: FeatChoiceOption2014 }>;
};

export async function findFeatChoiceOptionDrift(prisma: PrismaClient): Promise<FeatChoiceOptionDrift> {
  const seedOptions = buildFeatChoiceOptions2014();
  const databaseOptions = await prisma.choiceOption.findMany({
    where: { optionNameEng: { in: seedOptions.map((option) => option.optionNameEng) } },
    include: { featChoiceOptions: { include: { feat: { select: { name: true, ruleset: true } } } } },
  });
  const databaseByName = new Map(databaseOptions.map((option) => [option.optionNameEng, option]));
  const drift: FeatChoiceOptionDrift = { missing: [], unlinked: [], staleTexts: [], staleEffects: [] };

  for (const option of seedOptions) {
    const existing = databaseByName.get(option.optionNameEng);
    if (!existing) {
      drift.missing.push(option);
      continue;
    }
    const isLinked = existing.featChoiceOptions.some((link) => link.feat.name === option.feat && link.feat.ruleset === "RULES_2014");
    if (!isLinked) drift.unlinked.push(option);
    for (const field of ["groupName", "optionName"] as const) {
      if (existing[field] !== option[field]) drift.staleTexts.push({ optionNameEng: option.optionNameEng, field, database: existing[field], seed: option[field] });
    }
    if (hasDifferentEffect(existing, option)) drift.staleEffects.push({ choiceOptionId: existing.choiceOptionId, option });
  }

  return drift;
}

export async function syncFeatChoiceEffectsFromSeed(prisma: PrismaClient): Promise<number> {
  const { staleEffects } = await findFeatChoiceOptionDrift(prisma);
  for (const { choiceOptionId, option } of staleEffects) {
    await prisma.choiceOption.update({
      where: { choiceOptionId },
      data: { effectKind: option.effectKind, effectAbility: option.effectAbility, effectSkill: option.effectSkill, effectAmount: option.effectAmount },
    });
  }
  return staleEffects.length;
}

function hasDifferentEffect(
  existing: Pick<FeatChoiceOption2014, "effectKind" | "effectAbility" | "effectSkill" | "effectAmount">,
  option: FeatChoiceOption2014,
): boolean {
  return (
    existing.effectKind !== option.effectKind ||
    existing.effectAbility !== option.effectAbility ||
    existing.effectSkill !== option.effectSkill ||
    existing.effectAmount !== option.effectAmount
  );
}
