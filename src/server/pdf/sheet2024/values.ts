import { Ability, ArmorType, Size, SkillProficiencyType, Skills, WeaponType } from "@prisma/client";

import {
  calculateFinalAC,
  calculateFinalInitiative,
  calculateFinalMaxHP,
  calculateFinalModifier,
  calculateFinalProficiency,
  calculateFinalSave,
  calculateFinalSkill,
  calculateFinalSpeed,
  calculateFinalStat,
  calculatePassiveSkill,
  calculateSpellAttack,
  calculateSpellDC,
  collectActiveFeatures,
} from "@/lib/logic/bonus-calculator";
import { buildPersSpeciesName } from "@/lib/logic/pers-species-name";
import { calculatePersProficiencies } from "@/lib/logic/pers-proficiencies";
import { formatModifier } from "@/lib/logic/utils";
import { SizeTranslations, abilityTranslations } from "@/lib/refs/translation";

import {
  buildAttacksSpellcastingText,
  buildClassLevelString,
  buildEquipmentText,
  buildHitDiceInfoFromPers,
  buildProficiencyAndLanguageBlock,
  buildSubclassString,
  COIN_KEYS,
  collectFeatureListItems,
  collectPrintableWeaponAttacks,
  formatCoinAmount,
  formatFeatureList,
  formatSpellSlotTexts,
  formatWeaponName,
  getPersExtras,
  getSpellcastingAbility,
  getSpellSlots,
  translateBackgroundName,
  translateClassName,
} from "../characterSheetText";
import type { CharacterPdfData } from "../types";
import {
  ABILITIES,
  SPELL_ROWS_PER_PAGE,
  SPELL_SLOT_LEVELS,
  WEAPON_ROWS,
  fieldNames,
} from "./layout";
import { buildNameCandidates, collectSpellTableRows, type SpellTableRow } from "./spellRows";

/// Масив — варіанти тексту від найповнішого; друкується перший, що влазить читабельним кеглем.
export type SheetValue = string | boolean | string[];
export type SheetValues = Record<string, SheetValue>;

/// Текст, що не влазить у перше поле, продовжується в наступних за порядком.
export type TextFlow = { lines: string[]; fieldNames: string[] };

export type Sheet2024Content = {
  main: SheetValues;
  magicPages: SheetValues[];
  details: SheetValues;
  notes: SheetValues;
  flows: TextFlow[];
  portraitKey: string | null;
};

type Pers = CharacterPdfData["pers"];

export function buildSheet2024Content(data: CharacterPdfData): Sheet2024Content {
  const { pers } = data;
  const features = collectFeatureListItems(data);
  const weaponAttacks = collectPrintableWeaponAttacks(pers);

  return {
    main: {
      ...buildIdentityValues(pers),
      ...buildVitalsValues(pers),
      ...buildAbilityValues(pers),
      ...buildWeaponValues(weaponAttacks.slice(0, WEAPON_ROWS)),
      ...buildTrainingValues(pers),
      attacksAndSpellcasting: buildAttacksSpellcastingText(pers, weaponAttacks.slice(WEAPON_ROWS)),
      feats: formatFeatureList(features.filter((feature) => feature.source === "FEAT")),
    },
    magicPages: buildMagicPages(pers),
    details: {},
    notes: { [fieldNames.notes(1)]: pers.notes ?? "" },
    flows: [
      {
        lines: formatFeatureList(features.filter((feature) => feature.source !== "FEAT")).split("\n").filter(Boolean),
        fieldNames: ["classFeaturesLeft", "classFeaturesRight", "additionalFeatures"],
      },
    ],
    portraitKey: pers.portraitKey ?? null,
  };
}

function buildIdentityValues(pers: Pers): SheetValues {
  const xp = getPersExtras(pers).xp ?? 0;
  return {
    characterName: pers.name,
    background: translateBackgroundName(pers.background?.name),
    className: (pers.multiclasses ?? []).length > 0 ? buildClassLevelString(pers) : translateClassName(pers.class.name),
    species: buildPersSpeciesName(pers),
    subclass: buildSubclassString(pers),
    level: String(pers.level),
    xp: xp > 0 ? String(xp) : "",
  };
}

function buildVitalsValues(pers: Pers): SheetValues {
  const extras = getPersExtras(pers);
  const hitDice = buildHitDiceInfoFromPers(pers);
  const successes = extras.deathSaveSuccesses ?? 0;
  const failures = extras.deathSaveFailures ?? 0;
  return {
    armorClass: String(calculateFinalAC(pers)),
    shield: Boolean(pers.wearsShield),
    hpMax: String(calculateFinalMaxHP(pers)),
    hitDiceMax: String(hitDice.chunks.reduce((sum, chunk) => sum + chunk.max, 0)),
    hitDieType: formatHitDieTypes(hitDice.chunks),
    ...Object.fromEntries([1, 2, 3].map((index) => [fieldNames.deathSuccess(index), index <= successes])),
    ...Object.fromEntries([1, 2, 3].map((index) => [fieldNames.deathFailure(index), index <= failures])),
    proficiencyBonus: formatModifier(calculateFinalProficiency(pers)),
    initiative: formatModifier(calculateFinalInitiative(pers)),
    speed: `${calculateFinalSpeed(pers)} футів`,
    passivePerception: String(calculatePassiveSkill(pers, Skills.PERCEPTION)),
  };
}

function formatHitDieTypes(chunks: Array<{ max: number; die: number }>): string {
  if (chunks.length === 1) return `к${chunks[0].die}`;
  return chunks.map((chunk) => `${chunk.max}к${chunk.die}`).join("+");
}

function buildAbilityValues(pers: Pers): SheetValues {
  const saveProficiencies = getPersExtras(pers).additionalSaveProficiencies ?? [];
  const abilityValues = ABILITIES.flatMap((ability) => [
    [fieldNames.abilityModifier(ability), formatModifier(calculateFinalModifier(pers, ability))],
    [fieldNames.abilityScore(ability), String(calculateFinalStat(pers, ability))],
    [fieldNames.save(ability), formatModifier(calculateFinalSave(pers, ability))],
    [fieldNames.saveProficient(ability), saveProficiencies.includes(ability)],
  ]);
  const skillValues = Object.values(Skills).flatMap((skill) => {
    const { total, proficiency } = calculateFinalSkill(pers, skill);
    const isProficient = proficiency === SkillProficiencyType.PROFICIENT || proficiency === SkillProficiencyType.EXPERTISE;
    return [
      [fieldNames.skill(skill), formatModifier(total)],
      [fieldNames.skillProficient(skill), isProficient],
    ];
  });
  return Object.fromEntries([...abilityValues, ...skillValues]);
}

function buildWeaponValues(weapons: ReturnType<typeof collectPrintableWeaponAttacks>): SheetValues {
  return Object.fromEntries(
    weapons.flatMap((weapon, index) => {
      const row = index + 1;
      return [
        [fieldNames.weapon(row, "name"), formatWeaponName(weapon)],
        [fieldNames.weapon(row, "bonus"), weapon.attackBonus],
        [fieldNames.weapon(row, "damage"), [weapon.damage, weapon.damageType].filter(Boolean).join(" ")],
        [fieldNames.weapon(row, "notes"), weapon.notes ?? ""],
      ];
    }),
  );
}

function buildTrainingValues(pers: Pers): SheetValues {
  const derived = calculatePersProficiencies(pers);
  return {
    "armorTraining_light": derived.armor.includes(ArmorType.LIGHT),
    "armorTraining_medium": derived.armor.includes(ArmorType.MEDIUM),
    "armorTraining_heavy": derived.armor.includes(ArmorType.HEAVY),
    "armorTraining_shield": derived.armor.includes(ArmorType.SHIELD),
    "weaponTraining_simple": derived.weaponTypes.includes(WeaponType.SIMPLE_WEAPON),
    "weaponTraining_martial": derived.weaponTypes.includes(WeaponType.MARTIAL_WEAPON),
    "weaponTraining_other": derived.weaponTypes.includes(WeaponType.FIREARMS) || derived.weapons.length > 0,
    toolsAndLanguages: buildProficiencyAndLanguageBlock(pers),
  };
}

function buildMagicPages(pers: Pers): SheetValues[] {
  const header = buildSpellcastingHeaderValues(pers);
  const spellPages = chunkSpellRows(collectSpellTableRows(pers));
  return spellPages.map((rows, pageIndex) => ({
    ...header,
    ...buildSpellRowValues(rows),
    ...(pageIndex === 0 ? { ...buildSpellSlotValues(pers), ...buildPhysicalValues(pers), ...buildCharacterDetailValues(pers) } : {}),
  }));
}

function chunkSpellRows(rows: SpellTableRow[]): SpellTableRow[][] {
  const pageCount = Math.max(1, Math.ceil(rows.length / SPELL_ROWS_PER_PAGE));
  return Array.from({ length: pageCount }, (_, index) => rows.slice(index * SPELL_ROWS_PER_PAGE, (index + 1) * SPELL_ROWS_PER_PAGE));
}

function buildSpellcastingHeaderValues(pers: Pers): SheetValues {
  const ability = getSpellcastingAbility(pers);
  if (!ability) return {};
  return {
    spellcastingAbility: abilityTranslations[ability] ?? ability,
    spellcastingModifier: formatModifier(calculateFinalModifier(pers, ability)),
    spellSaveDc: String(calculateSpellDC(pers, ability)),
    spellAttackBonus: formatModifier(calculateSpellAttack(pers, ability)),
  };
}

function buildSpellSlotValues(pers: Pers): SheetValues {
  return Object.fromEntries(
    SPELL_SLOT_LEVELS.map((level) => {
      const { total, remaining } = formatSpellSlotTexts(getSpellSlots(pers, level));
      return [fieldNames.spellSlots(level), [total, remaining].filter(Boolean).join(" ")];
    }),
  );
}

function buildSpellRowValues(rows: SpellTableRow[]): SheetValues {
  return Object.fromEntries(
    rows.flatMap((spell, index) => {
      const row = index + 1;
      return [
        [fieldNames.spell(row, "level"), String(spell.level)],
        [fieldNames.spell(row, "name"), buildNameCandidates(spell.name)],
        [fieldNames.spell(row, "castingTime"), spell.castingTime],
        [fieldNames.spell(row, "range"), spell.range],
        [fieldNames.spell(row, "concentration"), spell.isConcentration],
        [fieldNames.spell(row, "ritual"), spell.isRitual],
        [fieldNames.spell(row, "material"), spell.needsMaterial],
        [fieldNames.spell(row, "notes"), spell.notes],
      ];
    }),
  );
}

/// Таблиця «Вантажопідйомність» PHB 2024: множник Сили за розміром.
const CARRYING_MULTIPLIER_BY_SIZE: Record<Size, number> = {
  TINY: 7.5,
  SMALL: 15,
  MEDIUM: 15,
  LARGE: 30,
  HUGE: 60,
  GARGANTUAN: 120,
};
const SIZE_ORDER: Size[] = [Size.TINY, Size.SMALL, Size.MEDIUM, Size.LARGE, Size.HUGE, Size.GARGANTUAN];

function buildPhysicalValues(pers: Pers): SheetValues {
  const strength = calculateFinalStat(pers, Ability.STR);
  const sizes = pers.race?.size ?? [];
  const carryingSize = findCarryingSize(pers, sizes);
  return {
    size: sizes.length === 1 ? SizeTranslations[sizes[0]] ?? "" : "",
    carryingCapacity: carryingSize ? `${strength * CARRYING_MULTIPLIER_BY_SIZE[carryingSize]} фнт.` : "",
    jumpHigh: `${Math.max(0, 3 + calculateFinalModifier(pers, Ability.STR))} футів`,
    jumpLong: `${strength} футів`,
  };
}

/// Розмір, за яким рахується вантаж: «Могутня статура» голіафа додає один щабель.
/// Коли вид дозволяє кілька розмірів із різним множником, число лишається гравцеві.
function findCarryingSize(pers: Pers, sizes: Size[]): Size | null {
  const multipliers = new Set(sizes.map((size) => CARRYING_MULTIPLIER_BY_SIZE[size]));
  if (sizes.length === 0 || multipliers.size !== 1) return null;
  const hasPowerfulBuild = collectActiveFeatures(pers).some((feature) => feature.engName?.includes("Powerful Build"));
  const baseIndex = SIZE_ORDER.indexOf(sizes[0]);
  return hasPowerfulBuild ? SIZE_ORDER[Math.min(baseIndex + 1, SIZE_ORDER.length - 1)] : sizes[0];
}

function buildCharacterDetailValues(pers: Pers): SheetValues {
  return {
    backstory: buildBackstoryText(pers),
    alignment: getPersExtras(pers).alignment ?? "",
    equipment: buildEquipmentText(pers),
    ...Object.fromEntries(COIN_KEYS.map((coin) => [fieldNames.coin(coin), formatCoinAmount(pers, coin)])),
    attunement: (pers.magicItems ?? [])
      .filter((item) => item.isAttuned && item.magicItem)
      .map((item) => item.magicItem.name)
      .join(", "),
  };
}

function buildBackstoryText(pers: Pers): string {
  const sections: Array<[string, string | null | undefined]> = [
    ["Риси характеру", pers.personalityTraits],
    ["Ідеали", pers.ideals],
    ["Привʼязаності", pers.bonds],
    ["Вади", pers.flaws],
    ["Передісторія", pers.backstory],
  ];
  return sections
    .filter(([, text]) => text?.trim())
    .map(([title, text]) => `${title}: ${text?.trim()}`)
    .join("\n");
}
