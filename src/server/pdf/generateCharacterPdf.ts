import { auth } from "@/lib/auth";
import { getCharacterFeaturesGrouped, getPersById } from "@/lib/actions/pers";
import {
  calculateFinalAC,
  calculateFinalInitiative,
  calculateFinalModifier,
  calculateFinalProficiency,
  calculateFinalSave,
  calculateFinalSkill,
  calculateFinalSpeed,
  calculatePassiveSkill,
  calculateFinalStat,
  calculateFinalMaxHP,
  calculateWeaponAttackBonus,
  calculateWeaponDamageBonus,
  calculateWeaponDamageDice,
  calculateDamageResistances,
  calculateDarkvisionRange,
  calculateSpellAttack,
  calculateSpellDC,
} from "@/lib/logic/bonus-calculator";
import { formatModifier } from "@/lib/logic/utils";
import { buildHitDicePools, findMainClassLevel } from "@/rules/hit-dice";
import { Ability, AbilityBonusType, Skills, SkillProficiencyType } from "@prisma/client";
import { PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFString, PDFTextField, rgb, type PDFFont, type PDFPage, type PDFForm } from "pdf-lib";

import fontkit from "@pdf-lib/fontkit";

import { armorTranslations, backgroundTranslations, classTranslations, weaponTranslations, abilityTranslations, damageTypeTranslations } from "@/lib/refs/translation";
import { weaponMasteryNames } from "@/lib/refs/weapon-mastery";
import { stripGlossaryMarkers } from "@/lib/refs/glossary-marker";
import { buildPersSpeciesName } from "@/lib/logic/pers-species-name";
import { translatePdfText } from "./translatePdfText";
import { buildProficiencyAndLanguageText } from "./proficiencyLanguageText";
import { appendMissingProficiencies, calculatePersProficiencies } from "@/lib/logic/pers-proficiencies";

import { calculateCasterLevel } from "@/lib/logic/spell-logic";
import { SPELL_SLOT_PROGRESSION } from "@/lib/refs/static";
import { SKILL_ORDER_UA_SHEET } from "@/lib/logic/skillOrder";

import { createLogger, hashPII } from "@/server/logging/logger";
import { formatBytes, withStep } from "@/server/logging/perf";

import type { CharacterPdfData, PersSpellWithSpell, PrintConfig, PrintSection } from "./types";
import { collectSheetPdfSpells } from "./sheet-pdf-spells";
import {
  SPELL_SHEET_HEADER_FIELDS,
  SPELL_SHEET_ROWS,
  SPELL_SHEET_SLOT_FIELDS,
  paginateSpellsByLevel,
} from "./spellSheetLayout";
import { generateSpellsPdfBytes } from "./spellsPdf";
import { generateFeaturesPdfBytes } from "./featuresPdf";
import { generateMagicItemsPdfBytes } from "./magicItemsPdf";
import { generateCreaturesPdfBytes } from "./creaturesPdf";
import { collectPrintableWeaponMasteries } from "./weaponMasteryPrint";
import { findAttachedForms } from "@/server/db/wildshape";
import { findAttacksPerAction } from "@/rules/attacks-per-action";
import { findSpellcastingSources } from "@/rules/spell-sources";
import type { RulesetId } from "@/rules/strategies/types";
import { collectSpellcastingClasses } from "@/server/db/spell-sources";
import {
  formatEquipmentText,
  groupPrintableWeaponAttacks,
  type GroupedPrintableWeaponAttack,
  type PrintableWeaponAttack,
} from "./equipmentPrint";

export type CharacterPdfLogContext = {
  jobId?: string;
};

type Maybe<T> = T | null | undefined;

type PersExtraFields = {
  alignment?: string | null;
  xp?: number | null;
  tempHp?: number | null;
  deathSaveSuccesses?: number | null;
  deathSaveFailures?: number | null;
  isDead?: boolean | null;
  customProficiencies?: string | null;
  customLanguagesKnown?: string | null;
  additionalSaveProficiencies?: Ability[] | null;
  currentHitDice?: Record<string, number> | null;
};

function getPersExtras(pers: CharacterPdfData["pers"]): PersExtraFields {
  return pers as unknown as PersExtraFields;
}

function ensureTextFieldHasDA(form: PDFForm, fieldName: string) {
  const field = tryGetTextField(form, fieldName);
  if (!field) return null;

  // Some fields in the template have no /DA, which makes pdf-lib throw on setFontSize.
  // AcroForm has a valid /DA (e.g. /Helv 0 Tf 0 g), so we copy it to the field.
  try {
    const anyField = field as any;
    const hasFieldDA = anyField?.acroField?.dict?.lookup?.(PDFName.of("DA"));

    if (!hasFieldDA) {
      // IMPORTANT: the AcroForm /DA in this PDF uses escaped "\057Helv" and pdf-lib
      // fails to parse it when copied. Provide a clean DA string instead.
      // Helv is present in AcroForm DR.
      anyField.acroField.dict.set(PDFName.of("DA"), PDFString.of("/Helv 0 Tf 0 g"));
    }
  } catch {
    // ignore
  }

  return field;
}

function trySetFontSize(form: PDFForm, fieldName: string, size: number) {
  try {
    const field = ensureTextFieldHasDA(form, fieldName);
    if (!field) return;
    field.setFontSize(size);
  } catch {
    // ignore
  }
}

function ensureAllTextFieldsHaveDA(form: PDFForm) {
  try {
    for (const f of form.getFields()) {
      if (!(f instanceof PDFTextField)) continue;
      try {
        const anyField = f as any;
        const hasFieldDA = anyField?.acroField?.dict?.lookup?.(PDFName.of("DA"));
        if (!hasFieldDA) {
          anyField.acroField.dict.set(PDFName.of("DA"), PDFString.of("/Helv 0 Tf 0 g"));
        }
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
}

function formatDiceUkr(value: string): string {
  return (value ?? "").replaceAll("d", "к").replaceAll("D", "к");
}

function compactDiceSum(value: string): string {
  // Keep hit dice sums inside narrow fields by removing extra spaces.
  return String(value ?? "")
    .replaceAll(" + ", "+")
    .replaceAll(" +", "+")
    .replaceAll("+ ", "+")
    .trim();
}

function buildEquipmentText(pers: CharacterPdfData["pers"]): string {
  const parts: string[] = [];

  const customEquipment = formatEquipmentText(String((pers as any).customEquipment ?? ""));
  if (customEquipment) parts.push(customEquipment);

  const magicItems = (pers.magicItems ?? []) as any[];
  if (magicItems.length > 0) {
    parts.push("Магічні предмети:");
    for (const pmi of magicItems) {
      if (!pmi.magicItem) continue;
      const name = pmi.magicItem.name;
      const attunementMark = pmi.isAttuned ? " (A)" : "";
      const equippedMark = pmi.isEquipped ? "[x]" : "[ ]";
      
      parts.push(`· ${equippedMark} ${name} ${attunementMark}`);
    }
  }

  return parts.filter(Boolean).join("\n");
}

function buildAttacksSpellcastingText(
  pers: CharacterPdfData["pers"],
  overflowWeapons: GroupedPrintableWeaponAttack[]
): string {
  return [
    ...buildAttacksPerActionLines(pers),
    ...buildOverflowWeaponLines(overflowWeapons),
    ...buildWeaponMasteryLines(pers),
    buildArmorAndShieldText(pers),
  ].join("\n");
}

function buildAttacksPerActionLines(pers: CharacterPdfData["pers"]): string[] {
  const attacksPerAction = findAttacksPerAction(
    pers.ruleset,
    (pers.features ?? []).map((entry) => entry.feature.engName),
  );
  return attacksPerAction !== null && attacksPerAction > 1 ? [`Атак за дію: ${attacksPerAction}`] : [];
}

function buildOverflowWeaponLines(overflowWeapons: GroupedPrintableWeaponAttack[]): string[] {
  if (overflowWeapons.length === 0) return [];
  return ["Ще зброя:", ...overflowWeapons.map((weapon) => `· ${formatWeaponName(weapon)}: ${weapon.attackBonus}, ${weapon.damage}`)];
}

function buildWeaponMasteryLines(pers: CharacterPdfData["pers"]): string[] {
  const mastered = (pers.pers_weapon_mastery ?? []).map((entry) => {
    const name = translateFromMap(weaponTranslations, entry.weapon.name);
    return entry.weapon.mastery ? `${name} (${weaponMasteryNames[entry.weapon.mastery]})` : name;
  });
  return mastered.length > 0 ? [`Майстерність зброї: ${mastered.join(", ")}`] : [];
}

function buildArmorAndShieldText(pers: CharacterPdfData["pers"]): string {
  const lines: string[] = [];

  const uaAbilityShort: Record<string, string> = {
    STR: "Сил",
    DEX: "Спр",
    CON: "Ст",
    INT: "Інт",
    WIS: "Муд",
    CHA: "Хар",
  };

  const armors = (pers.armors ?? []) as any[];
  if (armors.length > 0) {
    lines.push("Обладунки:");
    for (const pa of armors) {
      const rawName = String(pa?.armor?.name ?? "").trim();
      const name =
        (armorTranslations as unknown as Record<string, string>)[rawName] ??
        rawName ??
        "";
      if (!name) continue;
      const equipped = Boolean(pa?.equipped);

      const base = Number.isFinite(pa?.overrideBaseAC) ? Number(pa.overrideBaseAC) : Number(pa?.armor?.baseAC ?? 0);
      const misc = Number.isFinite(pa?.miscACBonus) ? Number(pa.miscACBonus) : 0;

      const persAbilities: Ability[] = Array.isArray((pa as any).abilityBonuses) ? (((pa as any).abilityBonuses as Ability[]) ?? []) : [];
      const armorAbilities: Ability[] = Array.isArray((pa?.armor as any)?.abilityBonuses)
        ? ((((pa.armor as any).abilityBonuses as Ability[]) ?? []) as Ability[])
        : [];

      const persType = (pa as any).abilityBonusType as AbilityBonusType | undefined;
      const armorType = (pa?.armor as any)?.abilityBonusType as AbilityBonusType | undefined;
      let type: AbilityBonusType = persType ?? armorType ?? AbilityBonusType.FULL;
      if (armorType && persType === AbilityBonusType.FULL && persAbilities.length === 0) {
        type = armorType;
      }

      const abilities = type === AbilityBonusType.NONE ? persAbilities : (persAbilities.length > 0 ? persAbilities : armorAbilities);
      const unique = Array.from(new Set(abilities));

      let bonus = 0;
      for (const ab of unique) {
        let mod = calculateFinalModifier(pers as any, ab);
        if (type === AbilityBonusType.MAX2 && ab === Ability.DEX) {
          mod = Math.min(mod, 2);
        }
        bonus += mod;
      }

      const totalAC = base + misc + bonus;

      const parts: string[] = [`КБ: ${base}`];
      if (misc) parts.push(`+${misc}`);
      if (unique.length > 0 && type !== AbilityBonusType.NONE) {
        const labels = unique.map((ab) => uaAbilityShort[String(ab)] ?? String(ab));
        parts.push(`+ ${labels.join(" + ")}`);
        if (type === AbilityBonusType.MAX2 && unique.includes(Ability.DEX)) {
          parts.push("(Спр max +2)");
        }
      }

      const formula = parts.join(" ");
      const stealthNote = pa?.armor?.stealthDisadvantage ? " перешкода на Непомітність" : "";
      lines.push(`· ${equipped ? "[x]" : "[ ]"} ${name} — ${totalAC} (${formula})${stealthNote}`);
    }
  }

  if ((pers as any).wearsShield) {
    lines.push(`Щит: так (+2 КБ)`);
  } else {
    lines.push("Щит: ні");
  }

  return lines.join("\n").trim();
}

function buildFeaturesListText(data: CharacterPdfData): string {
  const pers = data.pers;

  const classMeta = new Map<number, { levelGranted: number; displayOrder: number }>();
  for (const cf of (pers.class as any)?.features ?? []) {
    const id = Number(cf?.featureId ?? cf?.feature?.featureId);
    if (!Number.isFinite(id)) continue;
    classMeta.set(id, { levelGranted: Number(cf.levelGranted ?? 1), displayOrder: Number(cf.displayOrder ?? 0) });
  }
  for (const sf of (pers.subclass as any)?.features ?? []) {
    const id = Number(sf?.featureId ?? sf?.feature?.featureId);
    if (!Number.isFinite(id)) continue;
    classMeta.set(id, { levelGranted: Number(sf.levelGranted ?? 1), displayOrder: 0 });
  }

  for (const mc of pers.multiclasses ?? []) {
    for (const cf of (mc.class as any)?.features ?? []) {
      const id = Number(cf?.featureId ?? cf?.feature?.featureId);
      if (!Number.isFinite(id)) continue;
      if (!classMeta.has(id)) classMeta.set(id, { levelGranted: Number(cf.levelGranted ?? 1), displayOrder: Number(cf.displayOrder ?? 0) });
    }
    for (const sf of (mc.subclass as any)?.features ?? []) {
      const id = Number(sf?.featureId ?? sf?.feature?.featureId);
      if (!Number.isFinite(id)) continue;
      if (!classMeta.has(id)) classMeta.set(id, { levelGranted: Number(sf.levelGranted ?? 1), displayOrder: 0 });
    }
  }

  const sourceBaseOrder: Record<string, number> = {
    RACE: 0,
    SUBRACE: 0,
    BACKGROUND: 0,
    CLASS: 1,
    SUBCLASS: 2,
    FEAT: 3,
    PERS: 4,
    RACE_CHOICE: 5,
    CHOICE: 6,
  };

  const seen = new Set<string>();
  const items: Array<{ name: string; source: string; featureId?: number; sortKey: string }> = [];

  for (const group of Object.values(data.features ?? {})) {
    for (const item of group ?? []) {
      const name = String((item as any).name ?? "").trim();
      if (!name) continue;

      const displayName = translatePdfText(name).trim();
      if (!displayName) continue;

      const dedupKey = String((item as any).key ?? name).toLowerCase();
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);

      const source = String((item as any).source ?? "").toUpperCase();
      const featureId = typeof (item as any).featureId === "number" ? (item as any).featureId : undefined;
      const meta = featureId != null ? classMeta.get(featureId) : undefined;

      const baseOrder = sourceBaseOrder[source] ?? 9;
      const lvl = meta?.levelGranted ?? (baseOrder === 0 ? 1 : 99);
      const ord = meta?.displayOrder ?? 0;

      // sortKey keeps ordering stable
      const sortKey = `${String(baseOrder).padStart(2, "0")}:${String(lvl).padStart(2, "0")}:${String(ord).padStart(3, "0")}:${displayName.toLowerCase()}`;
      items.push({ name: displayName, source, featureId, sortKey });
    }
  }

  items.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  return items.map((it) => `· ${it.name}`).join("\n");
}

type CharacterPdfWeapon = CharacterPdfData["pers"]["weapons"][number];

function getWeaponAttackBonus(pers: CharacterPdfData["pers"], weapon: CharacterPdfWeapon): number {
  return calculateWeaponAttackBonus(pers as any, weapon);
}

function getWeaponDamageBonus(pers: CharacterPdfData["pers"], weapon: CharacterPdfWeapon): number {
  return calculateWeaponDamageBonus(pers as any, weapon);
}

const WEAPON_SLOTS = [
  { name: "Wpn Name", atk: "Wpn1 AtkBonus", dmg: "Wpn1 Damage" },
  { name: "Wpn Name 2", atk: "Wpn2 AtkBonus ", dmg: "Wpn2 Damage " },
  { name: "Wpn Name 3", atk: "Wpn3 AtkBonus  ", dmg: "Wpn3 Damage " },
];

function collectPrintableWeaponAttacks(pers: CharacterPdfData["pers"]): GroupedPrintableWeaponAttack[] {
  return groupPrintableWeaponAttacks((pers.weapons ?? []).map((weapon) => buildPrintableWeaponAttack(pers, weapon)));
}

function fillWeaponSlots(form: PDFForm, weapons: GroupedPrintableWeaponAttack[]) {
  WEAPON_SLOTS.forEach((slot, index) => {
    const weapon = weapons[index];
    if (!weapon) return;
    setTextIfPresent(form, slot.name, formatWeaponName(weapon));
    setTextIfPresent(form, slot.atk, weapon.attackBonus);
    setTextIfPresent(form, slot.dmg, weapon.damage);
  });
}

function formatWeaponName(weapon: GroupedPrintableWeaponAttack): string {
  return weapon.quantity === 1 ? weapon.name : `${weapon.name} ×${weapon.quantity}`;
}

function buildPrintableWeaponAttack(
  pers: CharacterPdfData["pers"],
  persWeapon: CharacterPdfWeapon
): PrintableWeaponAttack {
  const rawName = String(persWeapon.weapon?.name ?? "").trim();
  const localizedName = (weaponTranslations as unknown as Record<string, string>)[rawName] ?? rawName;
  const name = String(persWeapon.overrideName || localizedName).trim();
  const dice = calculateWeaponDamageDice(pers, persWeapon).trim();
  const damageBonus = formatModifier(getWeaponDamageBonus(pers, persWeapon));
  return {
    name,
    attackBonus: formatModifier(getWeaponAttackBonus(pers, persWeapon)),
    damage: dice ? `${formatDiceUkr(dice)}${damageBonus}` : "",
  };
}

const DEFAULT_SECTIONS: PrintSection[] = ["CHARACTER", "FEATURES", "SPELLS", "MAGIC_ITEMS", "WILDSHAPES"];

function safeText(value: Maybe<string | number>): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function normalizePrintConfig(config: PrintConfig | null | undefined): PrintConfig {
  const sections = (config?.sections?.length ? config.sections : DEFAULT_SECTIONS).filter(Boolean);
  return { sections, flattenCharacterSheet: config?.flattenCharacterSheet ?? true };
}

function groupPersSpellsByLevel(persSpells: PersSpellWithSpell[]): Map<number, PersSpellWithSpell[]> {
  const spellsByLevel = new Map<number, PersSpellWithSpell[]>();
  for (const persSpell of persSpells) {
    const level = persSpell.spell.level;
    spellsByLevel.set(level, [...(spellsByLevel.get(level) ?? []), persSpell]);
  }
  return spellsByLevel;
}

interface TwoLineResult {
  line1: string;
  line2?: string;
}

function translateFromMap(map: Record<string, string>, value: Maybe<string>): string {
  if (!value) return "";
  return map[value] ?? value;
}

function translateClassName(value: Maybe<string>): string {
  return translateFromMap(classTranslations as unknown as Record<string, string>, value);
}

function translateBackgroundName(value: Maybe<string>): string {
  return translateFromMap(backgroundTranslations as unknown as Record<string, string>, value);
}

function splitTextTwoLines(text: string, font: PDFFont, fontSize: number, maxWidth: number): TwoLineResult {
  if (!text || text.trim() === "") return { line1: "" };

  const textWidth = font.widthOfTextAtSize(text, fontSize);
  if (textWidth <= maxWidth) {
    return { line1: text };
  }

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= 1) {
    return { line1: text };
  }

  let line1 = "";
  let line2 = "";
  let splitIndex = 0;

  for (let i = 0; i < words.length; i++) {
    const testLine = words.slice(0, i + 1).join(" ");
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    if (testWidth <= maxWidth) {
      line1 = testLine;
      splitIndex = i + 1;
    } else {
      break;
    }
  }

  if (splitIndex === 0) {
    line1 = words[0];
    splitIndex = 1;
  }

  if (splitIndex < words.length) {
    line2 = words.slice(splitIndex).join(" ");
  }

  return line2 ? { line1, line2 } : { line1 };
}

function buildClassLevelString(pers: CharacterPdfData["pers"]): string {
  const multiclassLevelSum = pers.multiclasses?.reduce((acc, mc) => acc + mc.classLevel, 0) ?? 0;
  const mainClassLevel = pers.level - multiclassLevelSum;

  const parts: string[] = [];
  parts.push(`${translateClassName(pers.class.name)} ${mainClassLevel}`);

  for (const mc of pers.multiclasses ?? []) {
    parts.push(`${translateClassName(mc.class.name)} ${mc.classLevel}`);
  }

  return parts.join(" / ");
}

function buildHitDiceInfoFromPers(pers: CharacterPdfData["pers"]): {
  totalString: string;
  currentString: string;
  chunks: Array<{ current: number; max: number; die: number }>;
} {
  const multiclasses = pers.multiclasses ?? [];
  const classes = [
    {
      classId: pers.class.classId,
      hitDie: pers.class.hitDie,
      classLevel: findMainClassLevel(pers.level, multiclasses),
    },
    ...multiclasses.map((multiclass) => ({
      classId: multiclass.classId,
      hitDie: multiclass.class.hitDie,
      classLevel: multiclass.classLevel,
    })),
  ];

  const chunks = buildHitDicePools(classes, getPersExtras(pers).currentHitDice).map((pool) => ({
    current: pool.current,
    max: pool.max,
    die: pool.hitDie,
  }));

  const totalString = chunks.map((chunk) => `${chunk.max}d${chunk.die}`).join(" + ");
  const currentString = chunks.map((chunk) => `${chunk.current}d${chunk.die}`).join(" + ");
  return { totalString, currentString, chunks };
}

function tryGetTextField(form: PDFForm, name: string) {
  try {
    return form.getTextField(name);
  } catch {
    return null;
  }
}

function tryEnableMultiline(form: PDFForm, name: string) {
  const field = tryGetTextField(form, name);
  if (!field) return;
  try {
    field.enableMultiline();
  } catch {
    // ignore
  }
}

function setMultilineTextIfPresent(form: PDFForm, name: string, value: string) {
  const field = tryGetTextField(form, name);
  if (!field) return;
  try {
    field.enableMultiline();
  } catch {
    // ignore
  }
  try {
    field.setText(stripGlossaryMarkers(value ?? ""));
  } catch {
    // ignore
  }
}

function setTextFieldWithOverflow(
  form: PDFForm,
  name: string,
  value: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
) {
  const field = tryGetTextField(form, name);
  if (!field) return;

  const { line1, line2 } = splitTextTwoLines(stripGlossaryMarkers(value), font, fontSize, maxWidth);

  if (line2) {
    try {
      field.enableMultiline();
      field.setText(`${line1}\n${line2}`);
    } catch {
      field.setText(line1);
    }
  } else {
    field.setText(line1);
  }
}

function setTextIfPresent(form: PDFForm, name: string, value: string) {
  try {
    form.getTextField(name).setText(stripGlossaryMarkers(value ?? ""));
  } catch {
    return;
  }
}

function setCheckIfPresent(form: PDFForm, name: string, checked: boolean) {
  try {
    const field = form.getCheckBox(name);
    if (checked) field.check();
    else field.uncheck();
  } catch {
    return;
  }
}

function fillAbility(form: PDFForm, ability: Ability, score: number, mod: number) {
  const scoreFieldCandidates = {
    STR: ["STR", "Strength"],
    DEX: ["DEX", "Dexterity"],
    CON: ["CON", "Constitution"],
    INT: ["INT", "Intelligence"],
    WIS: ["WIS", "Wisdom"],
    CHA: ["CHA", "Charisma"],
  } as const;

  const modFieldCandidates = {
    STR: ["STRmod", "StrengthMod"],
    DEX: ["DEXmod", "DEXmod ", "DexterityMod"],
    CON: ["CONmod", "ConstitutionMod"],
    INT: ["INTmod", "IntelligenceMod"],
    WIS: ["WISmod", "WisdomMod"],
    CHA: ["CHamod", "CHAmod", "CharismaMod"],
  } as const;

  const scoreNames = scoreFieldCandidates[ability] ?? [];
  const modNames = modFieldCandidates[ability] ?? [];

  for (const name of scoreNames) setTextIfPresent(form, name, safeText(score));
  for (const name of modNames) setTextIfPresent(form, name, formatModifier(mod));
}

function fillSavingThrows(form: PDFForm, pers: CharacterPdfData["pers"]) {
  const extras = getPersExtras(pers);

  const mapping: Record<Ability, { value: string[]; proficient?: string[] }> = {
    STR: { value: ["ST Strength", "StrengthSave"], proficient: ["Check Box 11", "StrengthSaveProf"] },
    DEX: { value: ["ST Dexterity", "DexteritySave"], proficient: ["Check Box 18", "DexteritySaveProf"] },
    CON: { value: ["ST Constitution", "ConstitutionSave"], proficient: ["Check Box 19", "ConstitutionSaveProf"] },
    INT: { value: ["ST Intelligence", "IntelligenceSave"], proficient: ["Check Box 20", "IntelligenceSaveProf"] },
    WIS: { value: ["ST Wisdom", "WisdomSave"], proficient: ["Check Box 21", "WisdomSaveProf"] },
    CHA: { value: ["ST Charisma", "CharismaSave"], proficient: ["Check Box 22", "CharismaSaveProf"] },
  };

  for (const ability of Object.keys(mapping) as Ability[]) {
    const total = calculateFinalSave(pers, ability);
    for (const name of mapping[ability].value) setTextIfPresent(form, name, formatModifier(total));

    const isProficient = Array.isArray(extras.additionalSaveProficiencies) && extras.additionalSaveProficiencies.includes(ability);
    for (const chk of mapping[ability].proficient ?? []) setCheckIfPresent(form, chk, Boolean(isProficient));
  }
}

function fillSkills(form: PDFForm, pers: CharacterPdfData["pers"]) {

  // Назви полів у шаблоні pdf абсолютно прокляті. В мене чомусь не вийшло їх виправити, тому
  // не дивуйтеся, що назви скілів не відповідають назвам полів.
  const skillFieldNames: Partial<Record<Skills, { mod: string[]; prof?: string[] }>> = {
    [Skills.ACROBATICS]: { mod: ["Acrobatics"], prof: ["Check Box 23"] },
    [Skills.INSIGHT]: { mod: ["Animal"], prof: ["Check Box 24"] },
    [Skills.PERFORMANCE]: { mod: ["Arcana"], prof: ["Check Box 25"] },
    [Skills.ATHLETICS]: { mod: ["Athletics"], prof: ["Check Box 26"] },
    [Skills.SURVIVAL]: { mod: ["Deception", "Deception "], prof: ["Check Box 27"] },
    [Skills.ANIMAL_HANDLING]: { mod: ["History", "History "], prof: ["Check Box 28"] },
    [Skills.INTIMIDATION]: { mod: ["Insight"], prof: ["Check Box 29"] },
    [Skills.HISTORY]: { mod: ["Intimidation"], prof: ["Check Box 30"] },
    [Skills.MEDICINE]: { mod: ["Investigation", "Investigation "], prof: ["Check Box 31"] },
    [Skills.ARCANA]: { mod: ["Medicine"], prof: ["Check Box 32"] },
    [Skills.DECEPTION]: { mod: ["Nature"], prof: ["Check Box 33"] },
    [Skills.INVESTIGATION]: { mod: ["Perception", "Perception "], prof: ["Check Box 34"] },
    [Skills.PERSUASION]: { mod: ["Performance"], prof: ["Check Box 35"] },
    [Skills.NATURE]: { mod: ["Persuasion"], prof: ["Check Box 36"] },
    [Skills.RELIGION]: { mod: ["Religion"], prof: ["Check Box 37"] },
    [Skills.STEALTH]: { mod: ["SleightofHand"], prof: ["Check Box 38"] },
    [Skills.SLEIGHT_OF_HAND]: { mod: ["Stealth", "Stealth "], prof: ["Check Box 39"] },
    [Skills.PERCEPTION]: { mod: ["Survival"], prof: ["Check Box 40"] },
  };

  const ordered = SKILL_ORDER_UA_SHEET.filter((s) => Boolean(skillFieldNames[s]));
  const remaining = (Object.keys(skillFieldNames) as unknown as Skills[]).filter((s) => !ordered.includes(s));

  for (const skill of [...ordered, ...remaining]) {
    const mapping = skillFieldNames[skill];
    if (!mapping) continue;

    const { total, proficiency } = calculateFinalSkill(pers, skill);
    for (const name of mapping.mod) setTextIfPresent(form, name, formatModifier(total));

    const isProficient = proficiency === SkillProficiencyType.PROFICIENT || proficiency === SkillProficiencyType.EXPERTISE;
    for (const chk of mapping.prof ?? []) setCheckIfPresent(form, chk, Boolean(isProficient));
  }
}

function fillDeathSaves(form: PDFForm, pers: CharacterPdfData["pers"]) {
  const extras = getPersExtras(pers);
  const successes = Number.isFinite(extras.deathSaveSuccesses) ? Math.max(0, Math.trunc(extras.deathSaveSuccesses as number)) : 0;
  const failures = Number.isFinite(extras.deathSaveFailures) ? Math.max(0, Math.trunc(extras.deathSaveFailures as number)) : 0;

  for (let i = 1; i <= 3; i++) {
    // CharacterSheet_fixed.pdf uses Check Box 12-17 for death saves.
    setCheckIfPresent(form, `Check Box ${11 + i}`, i <= successes);
    setCheckIfPresent(form, `Check Box ${14 + i}`, i <= failures);
  }
}

/** Бланк має одне поле, тож у друк іде перше джерело — початковий клас або його підклас. */
function getSpellcastingAbility(pers: CharacterPdfData["pers"]): Ability | null {
  const [first] = findSpellcastingSources({
    ruleset: pers.ruleset as RulesetId,
    characterClasses: collectSpellcastingClasses(pers),
    raceTraits: [],
    raceChoiceOptions: [],
    featOptions: [],
  });

  return (first?.ability as Ability | undefined) ?? null;
}

function getSpellSlots(pers: CharacterPdfData["pers"], level: number): { standard: number; pact: number } {
  const caster = calculateCasterLevel(pers as any);
  
  if (level < 1 || level > 9) return { standard: 0, pact: 0 };
  
  const standardSlotsArray = (SPELL_SLOT_PROGRESSION as any).FULL?.[caster.casterLevel] as number[] | undefined;
  const standard = standardSlotsArray ? (standardSlotsArray[level - 1] ?? 0) : 0;

  const pactRow = (SPELL_SLOT_PROGRESSION as any).PACT?.[caster.pactLevel] as { slots: number; level: number } | undefined;
  const pact = (pactRow && pactRow.level === level) ? pactRow.slots : 0;

  return { standard, pact };
}

type SpellSlotTexts = { total: string; remaining: string };

function formatSpellSlotTexts({ standard, pact }: { standard: number; pact: number }): SpellSlotTexts {
  if (pact === 0) return { total: standard > 0 ? String(standard) : "", remaining: "" };
  if (standard === 0) return { total: String(pact), remaining: PACT_SLOT_NOTE };
  return { total: String(standard), remaining: `+${pact} ${PACT_SLOT_NOTE}` };
}

const PACT_SLOT_NOTE = "пакт · кор. відп.";
const SPELL_NAME_FONT_SIZE = 9;
const SPELL_SHEET_HEADER_FONT_SIZE = 11;
const PACT_SLOT_NOTE_FONT_SIZE = 7;

function fillSpellSheetPage(form: PDFForm, pers: CharacterPdfData["pers"], spellsOnPage: Map<number, PersSpellWithSpell[]>, isFirstPage: boolean) {
  fillSpellSheetHeader(form, pers);
  if (isFirstPage) fillSpellSlots(form, pers);
  fillSpellRows(form, spellsOnPage);
}

function fillSpellSheetHeader(form: PDFForm, pers: CharacterPdfData["pers"]) {
  setSpellSheetHeaderText(form, SPELL_SHEET_HEADER_FIELDS.spellcastingClass, buildClassLevelString(pers));

  const ability = getSpellcastingAbility(pers);
  if (!ability) return;
  setSpellSheetHeaderText(form, SPELL_SHEET_HEADER_FIELDS.spellcastingAbility, abilityTranslations[ability] || ability);
  setSpellSheetHeaderText(form, SPELL_SHEET_HEADER_FIELDS.spellSaveDc, safeText(calculateSpellDC(pers, ability)));
  setSpellSheetHeaderText(form, SPELL_SHEET_HEADER_FIELDS.spellAttackBonus, formatModifier(calculateSpellAttack(pers, ability)));
}

function setSpellSheetHeaderText(form: PDFForm, name: string, value: string) {
  setTextIfPresent(form, name, value);
  trySetFontSize(form, name, SPELL_SHEET_HEADER_FONT_SIZE);
}

function fillSpellSlots(form: PDFForm, pers: CharacterPdfData["pers"]) {
  for (const [level, fields] of Object.entries(SPELL_SHEET_SLOT_FIELDS)) {
    const texts = formatSpellSlotTexts(getSpellSlots(pers, Number(level)));
    if (texts.total) setTextIfPresent(form, fields.total, texts.total);
    if (!texts.remaining) continue;
    setTextIfPresent(form, fields.remaining, texts.remaining);
    trySetFontSize(form, fields.remaining, PACT_SLOT_NOTE_FONT_SIZE);
  }
}

function fillSpellRows(form: PDFForm, spellsOnPage: Map<number, PersSpellWithSpell[]>) {
  for (const [level, spells] of spellsOnPage) {
    const rows = SPELL_SHEET_ROWS[level as keyof typeof SPELL_SHEET_ROWS];
    spells.forEach((persSpell, index) => {
      const row = rows[index];
      setTextIfPresent(form, row.nameField, persSpell.spell.name);
      trySetFontSize(form, row.nameField, SPELL_NAME_FONT_SIZE);
      if (row.preparedCheckBox) setCheckIfPresent(form, row.preparedCheckBox, persSpell.isPrepared);
    });
  }
}

const OVERFLOW_FIELDS: Array<{
  fieldName: string;
  maxWidth: number;
  fontSize: number;
}> = [
  { fieldName: "CharacterName", maxWidth: 200, fontSize: 12 },
  { fieldName: "ClassLevel", maxWidth: 200, fontSize: 10 },
  { fieldName: "Race", maxWidth: 180, fontSize: 10 },
  { fieldName: "PlayerName", maxWidth: 180, fontSize: 10 },
];

function fillFirstPageUsingExistingFields(form: PDFForm, data: CharacterPdfData, font: PDFFont) {
  const { pers } = data;
  const extras = getPersExtras(pers);

  // Make small numeric fields more readable
  for (const name of [
    "STRmod",
    "DEXmod",
    "DEXmod ",
    "CONmod",
    "INTmod",
    "WISmod",
    "CHamod",
    "ProfBonus",
    "AC",
    "Initiative",
    "Passive",
    "HDTotal",
    "HD",
  ]) {
    trySetFontSize(form, name, 12);
  }

  // Hit dice fields are visually cramped in the template.
  trySetFontSize(form, "HDTotal", 6);
  trySetFontSize(form, "HD", 6);

  for (const name of [
    "Wpn Name",
    "Wpn Name 2",
    "Wpn Name 3",
    "Wpn1 AtkBonus",
    "Wpn2 AtkBonus ",
    "Wpn3 AtkBonus  ",
    "Wpn1 Damage",
    "Wpn2 Damage ",
    "Wpn3 Damage ",
  ]) {
    trySetFontSize(form, name, 11);
  }

  for (const name of [
    "Equipment",
    "Features and Traits",
    "AttacksSpellcasting",
    "Proficiencies",
    "Languages",
    "ProficienciesLang",
    "PersonalityTraits",
    "PersonalityTraits ",
    "Ideals",
    "Bonds",
    "Flaws",
  ]) {
    tryEnableMultiline(form, name);
    trySetFontSize(form, name, 10);
  }

  // Equipment box is dense; keep it smaller.
  trySetFontSize(form, "Equipment", 7);

  for (const name of ["Features and Traits", "Proficiencies", "Languages", "ProficienciesLang"]) {
    trySetFontSize(form, name, 7);
  }

  // This field is text-heavy; keep it compact.
  trySetFontSize(form, "AttacksSpellcasting", 8);

  for (const name of [
    "ST Strength",
    "ST Dexterity",
    "ST Constitution",
    "ST Intelligence",
    "ST Wisdom",
    "ST Charisma",
    "StrengthSave",
    "DexteritySave",
    "ConstitutionSave",
    "IntelligenceSave",
    "WisdomSave",
    "CharismaSave",
    "Acrobatics",
    "Animal",
    "Arcana",
    "Athletics",
    "Deception",
    "Deception ",
    "History",
    "History ",
    "Insight",
    "Intimidation",
    "Investigation",
    "Investigation ",
    "Medicine",
    "Nature",
    "Perception",
    "Perception ",
    "Performance",
    "Persuasion",
    "Religion",
    "SleightofHand",
    "Stealth",
    "Stealth ",
    "Survival",
  ]) {
    // These widgets are physically small in the PDF template; large values clip/auto-shrink.
    // Setting a real font size (instead of the template's auto-size 0) still increases readability.
    trySetFontSize(form, name, 7);
  }

  for (const { fieldName, maxWidth, fontSize } of OVERFLOW_FIELDS) {
    let value = "";
    let candidates: string[] = [fieldName];
    switch (fieldName) {
      case "CharacterName":
        value = safeText(pers.name);
        break;
      case "ClassLevel":
        value = buildClassLevelString(pers);
        break;
      case "Race":
        value = buildPersSpeciesName(pers);
        candidates = ["Race", "Race "];
        break;
      case "PlayerName":
        value = safeText(pers.user?.name ?? pers.user?.email);
        break;
    }
    for (const name of candidates) {
      setTextFieldWithOverflow(form, name, value, font, fontSize, maxWidth);
    }
  }

  setTextIfPresent(form, "Background", translateBackgroundName(pers.background?.name));
  setTextIfPresent(form, "Alignment", safeText(extras.alignment));
  setTextIfPresent(form, "XP", safeText(extras.xp));

  for (const ability of [Ability.STR, Ability.DEX, Ability.CON, Ability.INT, Ability.WIS, Ability.CHA]) {
    const score = calculateFinalStat(pers, ability);
    const mod = calculateFinalModifier(pers, ability);
    fillAbility(form, ability, score, mod);
  }

  for (const name of ["ProficiencyBonus", "ProfBonus"]) {
    setTextIfPresent(form, name, formatModifier(calculateFinalProficiency(pers)));
  }

  setTextIfPresent(form, "AC", safeText(calculateFinalAC(pers)));
  setTextIfPresent(form, "Initiative", formatModifier(calculateFinalInitiative(pers)));
  setTextIfPresent(form, "Speed", safeText(calculateFinalSpeed(pers)));

  setTextIfPresent(form, "HPMax", safeText(calculateFinalMaxHP(pers)));
  // Don't print current HP and temporary HP
  // setTextIfPresent(form, "HPCurrent", safeText(pers.currentHp));
  // setTextIfPresent(form, "HPTemp", safeText(extras.tempHp ?? 0));

  const hitDice = buildHitDiceInfoFromPers(pers);
  for (const name of ["HitDiceTotal", "HDTotal"]) {
    trySetFontSize(form, name, 6);
    setTextIfPresent(form, name, compactDiceSum(formatDiceUkr(hitDice.totalString)));
  }
  // Don't print current hit dice
  // for (const name of ["HitDiceCurrent", "HD"]) {
  //   // Show per-class current/max (e.g. 1/2к8). Multiline is OK here if font is small and lines are short.
  //   tryEnableMultiline(form, name);
  //   trySetFontSize(form, name, 5);
  //   const perClass = formatHitDicePerClassLines(hitDice.chunks);
  //   setTextIfPresent(form, name, perClass);
  // }

  fillDeathSaves(form, pers);
  fillSavingThrows(form, pers);
  fillSkills(form, pers);

  const passivePerception = calculatePassiveSkill(pers, Skills.PERCEPTION);
  setTextIfPresent(form, "Passive", safeText(passivePerception));

  for (const name of ["PersonalityTraits", "PersonalityTraits "]) {
    setMultilineTextIfPresent(form, name, safeText(pers.personalityTraits));
  }
  setMultilineTextIfPresent(form, "Ideals", safeText(pers.ideals));
  setMultilineTextIfPresent(form, "Bonds", safeText(pers.bonds));
  setMultilineTextIfPresent(form, "Flaws", safeText(pers.flaws));

  const proficiencyText = appendMissingProficiencies(
    { proficiencies: safeText(extras.customProficiencies), languages: safeText(extras.customLanguagesKnown) },
    calculatePersProficiencies(pers),
  );
  const profAndLang = buildProficiencyAndLanguageText({
    customProficiencies: proficiencyText.proficiencies,
    customLanguages: proficiencyText.languages,
    darkvisionRange: calculateDarkvisionRange(pers),
    damageResistances: calculateDamageResistances(pers).map((type) => damageTypeTranslations[type] ?? type),
  });

  for (const name of ["Proficiencies", "Languages", "ProficienciesLang"]) {
    setMultilineTextIfPresent(form, name, profAndLang);
  }

  const weaponAttacks = collectPrintableWeaponAttacks(pers);
  fillWeaponSlots(form, weaponAttacks.slice(0, WEAPON_SLOTS.length));

  // Coins and equipment (armor + shield)
  const equipmentText = buildEquipmentText(pers);
  setMultilineTextIfPresent(form, "Equipment", equipmentText);
  // Don't print coins
  // setTextForFirstPresent(form, ["CP"], safeText((pers as any).cp));
  // setTextForFirstPresent(form, ["SP"], safeText((pers as any).sp));
  // setTextForFirstPresent(form, ["EP"], safeText((pers as any).ep));
  // setTextForFirstPresent(form, ["GP"], safeText((pers as any).gp));
  // setTextForFirstPresent(form, ["PP"], safeText((pers as any).pp));

  // "Уміння та Особливості" -> Features and Traits
  const featuresList = buildFeaturesListText(data);
  setMultilineTextIfPresent(form, "Features and Traits", featuresList);

  const attacksSpellcasting = buildAttacksSpellcastingText(pers, weaponAttacks.slice(WEAPON_SLOTS.length));
  setMultilineTextIfPresent(form, "AttacksSpellcasting", attacksSpellcasting);

  try {
    ensureAllTextFieldsHaveDA(form);
    form.updateFieldAppearances(font);
  } catch {
    // Some PDF viewers may still show values without refreshed appearances.
    // Don't abort generation; the caller may still flatten successfully.
  }
}

async function embedNotoSansFonts(pdfDoc: PDFDocument): Promise<{ regular: PDFFont; bold: PDFFont }> {
  const fs = await import("fs/promises");
  const path = await import("path");

  const regularPath = path.resolve(process.cwd(), "public", "fonts", "NotoSans-Regular.ttf");
  const boldPath = path.resolve(process.cwd(), "public", "fonts", "NotoSans-Bold.ttf");

  const [regularBytes, boldBytes] = await Promise.all([
    fs.readFile(regularPath),
    fs.readFile(boldPath),
  ]);

  pdfDoc.registerFontkit(fontkit);
  const regular = await pdfDoc.embedFont(regularBytes, { subset: true });
  const bold = await pdfDoc.embedFont(boldBytes, { subset: true });

  return { regular, bold };
}

export async function generateCharacterPdf(
  persId: number,
  userEmail: string,
  config: PrintConfig,
  logCtx: CharacterPdfLogContext = {}
): Promise<Uint8Array> {
  const normalized = normalizePrintConfig(config);

  const log = createLogger("pdf.character").child({
    jobId: logCtx.jobId,
    persId,
    sections: normalized.sections,
    user: { emailHash: hashPII(userEmail) },
  });

  log.info("start", {
    flattenCharacterSheet: (normalized as any).flattenCharacterSheet,
  });

  const session = await auth();
  if (!session?.user?.email) throw new Error("Unauthorized");
  if (session.user.email !== userEmail) throw new Error("Unauthorized");

  const pers = await withStep(
    "db.getPersById",
    (phase, fields) => (phase === "error" ? log.error("step", fields) : log.info("step", fields)),
    async () => getPersById(persId)
  );
  if (!pers) throw new Error("Not found");

  const features =
    (await withStep(
      "db.getCharacterFeaturesGrouped",
      (phase, fields) => (phase === "error" ? log.error("step", fields) : log.info("step", fields)),
      async () => getCharacterFeaturesGrouped(persId)
    )) ??
    ({ passive: [], actions: [], bonusActions: [], reactions: [] } as unknown as CharacterPdfData["features"]);

  const wildshapeForms = normalized.sections.includes("WILDSHAPES")
    ? (await findAttachedForms(persId)).flatMap((form) => (form.creature ? [form.creature] : []))
    : [];

  log.info("data.ready", {
    characterName: pers.name,
    spellsCount: collectSheetPdfSpells(pers).length,
    featuresCount:
      (features?.passive?.length ?? 0) +
      (features?.actions?.length ?? 0) +
      (features?.bonusActions?.length ?? 0) +
      (features?.reactions?.length ?? 0),
    magicItemsCount: (pers.magicItems ?? []).length,
    wildshapeFormsCount: wildshapeForms.length,
  });

  const data: CharacterPdfData = { pers, features, wildshapeForms };

  const pdfBytes = await withStep(
    "pdf.generateFromData",
    (phase, fields) => (phase === "error" ? log.error("step", fields) : log.info("step", fields)),
    async () => generateCharacterPdfFromData(data, normalized, logCtx)
  );

  log.info("end", { pdfBytes: pdfBytes.byteLength, pdfBytesFmt: formatBytes(pdfBytes.byteLength) });
  return pdfBytes;
}

export async function generateCharacterPdfFromData(
  data: CharacterPdfData,
  config: PrintConfig,
  logCtx: CharacterPdfLogContext = {}
): Promise<Uint8Array> {
  const normalized = normalizePrintConfig(config);

  const log = createLogger("pdf.character.data").child({
    jobId: logCtx.jobId,
    persId: (data as any)?.pers?.persId,
    characterName: (data as any)?.pers?.name,
    sections: normalized.sections,
  });

  const fs = await import("fs/promises");
  const path = await import("path");

  const templatePath = path.resolve(process.cwd(), "public", "CharacterSheet_fixed.pdf");
  const templateBytes = await withStep(
    "fs.readTemplate",
    (phase, fields) => (phase === "error" ? log.error("step", fields) : log.info("step", { ...fields, templatePath })),
    async () => fs.readFile(templatePath)
  );
  log.info("template.loaded", { templateBytes: templateBytes.byteLength, templateBytesFmt: formatBytes(templateBytes.byteLength) });

  const pdfDoc = await withStep(
    "pdf.loadTemplate",
    (phase, fields) => (phase === "error" ? log.error("step", fields) : log.info("step", fields)),
    async () => PDFDocument.load(templateBytes)
  );

  // 1. Створюємо НОВИЙ документ і копіюємо тільки ПЕРШУ сторінку (фікс порожніх сторінок)
  for (let i = pdfDoc.getPageCount() - 1; i > 0; i--) {
    try {
      pdfDoc.removePage(i);
    } catch {
      break;
    }
  }

  // Завантажуємо шрифти
  const { regular: notoSansRegular } = await withStep(
    "pdf.embedFonts",
    (phase, fields) => (phase === "error" ? log.error("step", fields) : log.info("step", fields)),
    async () => embedNotoSansFonts(pdfDoc)
  );

  if (normalized.sections.includes("CHARACTER")) {
    await withStep(
      "pdf.fillCharacterSheet",
      (phase, fields) => (phase === "error" ? log.error("step", fields) : log.info("step", fields)),
      async () => {
        const form = pdfDoc.getForm();
        fillFirstPageUsingExistingFields(form, data, notoSansRegular);
        if (data.pers.ruleset === "RULES_2024") relabelRaceAsSpecies(pdfDoc.getPage(0), notoSansRegular);

        if (normalized.flattenCharacterSheet) {
          try {
            form.updateFieldAppearances(notoSansRegular);
            form.flatten();
          } catch (err) {
            log.warn("character.flatten.failed", { err });
          }
        }
      }
    );
  } else {
    // Якщо персонаж НЕ обраний, видаляємо ПЕРШУ сторінку (шаблон чарника)
    try {
      pdfDoc.removePage(0);
    } catch {
      // ignore
    }
  }

  for (const section of collectRequestedSections(data, normalized, { logCtx, log })) {
    await appendSection(pdfDoc, section, notoSansRegular, log);
  }

  const out = await withStep(
    "pdf.save",
    (phase, fields) => (phase === "error" ? log.error("step", fields) : log.info("step", { ...fields, pages: pdfDoc.getPageCount() })),
    async () => pdfDoc.save()
  );

  log.info("result", { bytes: out.byteLength, bytesFmt: formatBytes(out.byteLength), pages: pdfDoc.getPageCount() });
  return out;
}

type PdfSectionLogger = ReturnType<typeof createLogger>;

type PdfSection = {
  title: string;
  loadDocuments: () => Promise<PDFDocument[]>;
};

const SECTION_ATTEMPTS = 2;

function collectRequestedSections(
  data: CharacterPdfData,
  config: PrintConfig,
  context: { logCtx: CharacterPdfLogContext; log: PdfSectionLogger }
): PdfSection[] {
  const { logCtx, log } = context;
  const requested = new Set(config.sections);
  const sections: Array<PdfSection & { isIncluded: boolean }> = [
    {
      title: "Бланк подробиць",
      isIncluded: requested.has("DETAILS"),
      loadDocuments: async () => [await PDFDocument.load(await readPublicFile("CharacterDetails.pdf"))],
    },
    {
      title: "Лист заклинань",
      isIncluded: requested.has("SPELL_SHEET"),
      loadDocuments: () => buildSpellSheetDocuments(data.pers, config.flattenCharacterSheet ?? true, log),
    },
    {
      title: "Здібності",
      isIncluded:
        requested.has("FEATURES") && (countFeatureItems(data.features) > 0 || collectPrintableWeaponMasteries(data.pers).length > 0),
      loadDocuments: () =>
        loadHtmlSection(() =>
          generateFeaturesPdfBytes(
            {
              characterName: data.pers.name,
              features: data.features,
              weaponMasteries: collectPrintableWeaponMasteries(data.pers),
            },
            { jobId: logCtx.jobId, tag: "features" }
          )
        ),
    },
    {
      title: "Описи заклинань",
      isIncluded: requested.has("SPELLS") && collectSheetPdfSpells(data.pers).length > 0,
      loadDocuments: () =>
        loadHtmlSection(() => generateSpellsPdfBytes(collectSheetPdfSpells(data.pers).map((entry) => entry.spellId), { jobId: logCtx.jobId, tag: "spells" })),
    },
    {
      title: "Магічні предмети",
      isIncluded: requested.has("MAGIC_ITEMS") && data.pers.magicItems.length > 0,
      loadDocuments: () =>
        loadHtmlSection(() =>
          generateMagicItemsPdfBytes(data.pers.magicItems.map((entry) => entry.magicItemId), { jobId: logCtx.jobId, tag: "magicItems" })
        ),
    },
    {
      title: "Дикі форми",
      isIncluded: requested.has("WILDSHAPES") && data.wildshapeForms.length > 0,
      loadDocuments: () => loadHtmlSection(() => generateCreaturesPdfBytes(data.wildshapeForms, { jobId: logCtx.jobId, tag: "wildshapes" })),
    },
  ];
  return sections.filter((section) => section.isIncluded);
}

function countFeatureItems(features: CharacterPdfData["features"]): number {
  return features.passive.length + features.actions.length + features.bonusActions.length + features.reactions.length;
}

async function loadHtmlSection(generateBytes: () => Promise<Uint8Array>): Promise<PDFDocument[]> {
  return [await PDFDocument.load(await generateBytes())];
}

async function appendSection(target: PDFDocument, section: PdfSection, font: PDFFont, log: PdfSectionLogger) {
  const documents = await loadSectionWithRetry(section, log);
  if (!documents) {
    appendSectionFailurePage(target, section.title, font);
    return;
  }
  for (const document of documents) {
    const pages = await target.copyPages(document, document.getPageIndices());
    pages.forEach((page) => target.addPage(page));
  }
  log.info("section.added", { section: section.title, documents: documents.length });
}

/** Секцію, яка не зібралася й з другої спроби, замінює видима сторінка, а не мовчазна дірка у файлі. */
async function loadSectionWithRetry(section: PdfSection, log: PdfSectionLogger): Promise<PDFDocument[] | null> {
  for (let attempt = 1; attempt <= SECTION_ATTEMPTS; attempt++) {
    try {
      return await section.loadDocuments();
    } catch (err) {
      log.warn("section.failed", { section: section.title, attempt, err });
    }
  }
  return null;
}

function appendSectionFailurePage(target: PDFDocument, title: string, font: PDFFont) {
  const page = target.addPage([612, 792]);
  page.drawText(`Секцію «${title}» не вдалося сформувати.`, { x: 56, y: 720, size: 16, font, color: rgb(0, 0, 0) });
  page.drawText("Спробуйте завантажити PDF ще раз.", { x: 56, y: 692, size: 12, font, color: rgb(0.3, 0.3, 0.3) });
}

async function buildSpellSheetDocuments(pers: CharacterPdfData["pers"], flatten: boolean, log: PdfSectionLogger): Promise<PDFDocument[]> {
  const [templateBytes, fontBytes] = await Promise.all([
    readPublicFile("CharacterSpells_fixed.pdf"),
    readPublicFile("fonts/NotoSans-Regular.ttf"),
  ]);
  const pages = paginateSpellsByLevel(groupPersSpellsByLevel(collectSheetPdfSpells(pers)));
  return Promise.all(
    pages.map((spellsOnPage, pageIndex) =>
      buildSpellSheetDocument({ templateBytes, fontBytes, flatten, log }, (form) => fillSpellSheetPage(form, pers, spellsOnPage, pageIndex === 0))
    )
  );
}

async function buildSpellSheetDocument(
  source: { templateBytes: Uint8Array; fontBytes: Uint8Array; flatten: boolean; log: PdfSectionLogger },
  fillForm: (form: PDFForm) => void
): Promise<PDFDocument> {
  const document = await PDFDocument.load(source.templateBytes);
  document.registerFontkit(fontkit);
  const font = await document.embedFont(source.fontBytes, { subset: true });
  const form = document.getForm();
  fillForm(form);
  try {
    form.updateFieldAppearances(font);
    if (source.flatten) form.flatten();
  } catch (err) {
    source.log.warn("spellSheet.flatten.failed", { err });
  }
  return document;
}

const RACE_LABEL = { text: "Раса", x: 269.156, baselineY: 694.85, size: 8 };

/** Підписи бланка — анотації FreeText поверх сторінки, тож підпис міняється заміною анотації, а не зафарбовуванням. */
function relabelRaceAsSpecies(page: PDFPage, font: PDFFont) {
  const annotations = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
  const labelIndex = findFreeTextAnnotationIndex(annotations, RACE_LABEL.text);
  if (!annotations || labelIndex === null) return;
  annotations.remove(labelIndex);
  page.drawText("Вид", { x: RACE_LABEL.x, y: RACE_LABEL.baselineY, size: RACE_LABEL.size, font, color: rgb(0, 0, 0) });
}

function findFreeTextAnnotationIndex(annotations: PDFArray | undefined, contents: string): number | null {
  for (let index = 0; index < (annotations?.size() ?? 0); index++) {
    const annotation = annotations?.lookupMaybe(index, PDFDict);
    const isFreeText = annotation?.get(PDFName.of("Subtype")) === PDFName.of("FreeText");
    const text = annotation?.lookupMaybe(PDFName.of("Contents"), PDFString, PDFHexString)?.decodeText();
    if (isFreeText && text === contents) return index;
  }
  return null;
}

async function readPublicFile(relativePath: string): Promise<Uint8Array> {
  const fs = await import("fs/promises");
  const path = await import("path");
  return fs.readFile(path.resolve(process.cwd(), "public", relativePath));
}
