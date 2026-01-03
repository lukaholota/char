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
  calculateFinalStat,
  calculateFinalMaxHP,
  calculateWeaponAttackBonus,
  calculateWeaponDamageBonus,
  calculateSpellAttack,
  calculateSpellDC,
} from "@/lib/logic/bonus-calculator";
import { formatModifier } from "@/lib/logic/utils";
import { Classes, Ability, Skills, SkillProficiencyType } from "@prisma/client";
import { PDFDocument, PDFName, PDFString, type PDFFont, type PDFPage, type PDFForm, TextAlignment } from "pdf-lib";

import fontkit from "@pdf-lib/fontkit";

import { armorTranslations, backgroundTranslations, classTranslations, raceTranslations, weaponTranslations, abilityTranslations } from "@/lib/refs/translation";
import { translatePdfText } from "./translatePdfText";

import { calculateCasterLevel } from "@/lib/logic/spell-logic";
import { SPELL_SLOT_PROGRESSION } from "@/lib/refs/static";

import { createLogger, hashPII } from "@/server/logging/logger";
import { formatBytes, withStep } from "@/server/logging/perf";

import type { CharacterPdfData, PersSpellWithSpell, PrintConfig, PrintSection } from "./types";
import { CHARACTER_SHEET_OVERLAY, type OverlayFieldKey, type OverlayText } from "./overlayLayout";
import { generateSpellsPdfBytes } from "./spellsPdf";
import { generateFeaturesPdfBytes } from "./featuresPdf";
import { generateMagicItemsPdfBytes } from "./magicItemsPdf";

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
  backstory?: string | null;
  notes?: string | null;
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
    const anyForm = form as any;
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

function multilineDiceSum(value: string): string {
  // Use multiple lines when the field is tall enough.
  const parts = String(value ?? "")
    .split("+")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length <= 1) return String(value ?? "").trim();
  return parts.join("\n+");
}

function compressDiceExpression(value: string): string {
  const raw = compactDiceSum(String(value ?? ""));
  if (!raw) return "";

  // Accept both Latin d and Ukrainian к.
  const re = /(\d+)\s*(?:к|d|D)\s*(\d+)/g;

  const order: number[] = [];
  const counts = new Map<number, number>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const count = Number(m[1]);
    const die = Number(m[2]);
    if (!Number.isFinite(count) || !Number.isFinite(die) || count <= 0 || die <= 0) continue;
    if (!counts.has(die)) order.push(die);
    counts.set(die, (counts.get(die) ?? 0) + count);
  }

  if (order.length === 0) return raw;
  return order
    .map((die) => ({ die, count: counts.get(die) ?? 0 }))
    .filter((x) => x.count > 0)
    .map((x) => `${x.count}к${x.die}`)
    .join("+");
}

function truncateText(value: string, maxLen: number): string {
  const raw = String(value ?? "").trim();
  if (raw.length <= maxLen) return raw;
  return raw.slice(0, Math.max(0, maxLen - 1)).trimEnd() + "…";
}

function formatHitDicePerClassLines(chunks: Array<{ current: number; max: number; die: number }>): string {
  const safeChunks = (chunks ?? [])
    .map((c) => ({
      current: Number.isFinite(c.current) ? Math.max(0, Math.trunc(c.current)) : 0,
      max: Number.isFinite(c.max) ? Math.max(0, Math.trunc(c.max)) : 0,
      die: Number.isFinite(c.die) ? Math.max(0, Math.trunc(c.die)) : 0,
    }))
    .filter((c) => c.max > 0 && c.die > 0);

  // Keep it short: one line per class chunk. Example: 1/2к8
  // Limit to 3 lines to avoid overlapping other PDF content.
  const lines = safeChunks.slice(0, 3).map((c) => `${c.current}/${c.max}к${c.die}`);
  if (safeChunks.length > 3) lines.push("…");
  return lines.join("\n");
}

function buildEquipmentText(pers: CharacterPdfData["pers"]): string {
  const parts: string[] = [];

  const customEquipment = String((pers as any).customEquipment ?? "")
    .trim()
    .replace(/ x1\n/g, '\n')
    .replace(/\n/g, ', ');
  console.log('customEquipment', customEquipment);
  if (customEquipment) parts.push(customEquipment);

  const magicItems = (pers.magicItems ?? []) as any[];
  if (magicItems.length > 0) {
    parts.push("Магічні предмети:");
    for (const pmi of magicItems) {
      if (!pmi.magicItem) continue;
      const name = pmi.magicItem.name;
      const type = pmi.magicItem.itemType;
      const rarity = pmi.magicItem.rarity;
      
      const attunementMark = pmi.isAttuned ? " (A)" : "";
      const equippedMark = pmi.isEquipped ? "[x]" : "[ ]";
      
      parts.push(`• ${equippedMark} ${name} ${attunementMark}`);
    }
  }

  return parts.filter(Boolean).join("\n");
}

function buildArmorAndShieldText(pers: CharacterPdfData["pers"]): string {
  const lines: string[] = [];

  const dexMod = calculateFinalModifier(pers as any, Ability.DEX);

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

      const armorType = String(pa?.armor?.armorType ?? "").toUpperCase();
      const base = Number.isFinite(pa?.overrideBaseAC) ? Number(pa.overrideBaseAC) : Number(pa?.armor?.baseAC ?? 0);
      const misc = Number.isFinite(pa?.miscACBonus) ? Number(pa.miscACBonus) : 0;

      let dexPart = 0;
      let formula = "";
      if (armorType === "LIGHT") {
        dexPart = dexMod;
        formula = `КБ: ${base}${misc ? `+${misc}` : ""} + Спр`;
      } else if (armorType === "MEDIUM") {
        dexPart = Math.min(dexMod, 2);
        formula = `КБ: ${base}${misc ? `+${misc}` : ""} + полов. Спр (max +2)`;
      } else {
        dexPart = 0;
        formula = `КБ: ${base}${misc ? `+${misc}` : ""}`;
      }

      const totalAC = base + misc + dexPart;
      const stealthNote = pa?.armor?.stealthDisadvantage ? " перешкода на Непомітність" : "";
      lines.push(`• ${equipped ? "[x]" : "[ ]"} ${name} — ${totalAC} (${formula})${stealthNote}`);
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
  return items.map((it) => `• ${it.name}`).join("\n");
}

function getWeaponAttackBonus(pers: CharacterPdfData["pers"], pw: any): number {
  return calculateWeaponAttackBonus(pers as any, pw as any);
}

function getWeaponDamageBonus(pers: CharacterPdfData["pers"], pw: any): number {
  return calculateWeaponDamageBonus(pers as any, pw as any);
}

function fillWeapons(form: PDFForm, pers: CharacterPdfData["pers"]) {
  const weapons = (pers.weapons ?? []) as any[];
  const slots = [
    { name: "Wpn Name", atk: "Wpn1 AtkBonus", dmg: "Wpn1 Damage" },
    { name: "Wpn Name 2", atk: "Wpn2 AtkBonus ", dmg: "Wpn2 Damage " },
    { name: "Wpn Name 3", atk: "Wpn3 AtkBonus  ", dmg: "Wpn3 Damage " },
  ];

  for (let i = 0; i < slots.length; i++) {
    const pw = weapons[i];
    if (!pw) continue;

    const localizedWeaponName = (() => {
      const raw = String(pw.weapon?.name ?? "").trim();
      if (!raw) return "";
      return (weaponTranslations as unknown as Record<string, string>)[raw] ?? raw;
    })();

    const displayName = String(pw.overrideName || localizedWeaponName || pw.weapon?.name || "").trim();
    const dice = String(pw.customDamageDice || pw.weapon?.damage || "").trim();
    const dmgBonus = getWeaponDamageBonus(pers, pw);
    const dmgText = dice ? `${formatDiceUkr(dice)}${formatModifier(dmgBonus)}` : "";
    const atkText = formatModifier(getWeaponAttackBonus(pers, pw));

    setTextIfPresent(form, slots[i].name, displayName);
    setTextIfPresent(form, slots[i].atk, atkText);
    setTextIfPresent(form, slots[i].dmg, dmgText);
  }
}

const DEFAULT_SECTIONS: PrintSection[] = ["CHARACTER", "FEATURES", "SPELLS", "MAGIC_ITEMS"];

function safeText(value: Maybe<string | number>): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function normalizePrintConfig(config: PrintConfig | null | undefined): PrintConfig {
  const sections = (config?.sections?.length ? config.sections : DEFAULT_SECTIONS).filter(Boolean);
  return { sections, flattenCharacterSheet: config?.flattenCharacterSheet ?? true };
}

function groupPersSpellsByLevel(persSpells: PersSpellWithSpell[]): Record<number, PersSpellWithSpell[]> {
  const out: Record<number, PersSpellWithSpell[]> = {};
  for (const ps of persSpells ?? []) {
    const level = ps.spell?.level ?? 0;
    if (!out[level]) out[level] = [];
    out[level].push(ps);
  }
  return out;
}

interface TwoLineResult {
  line1: string;
  line2?: string;
}

function translateFromMap(map: Record<string, string>, value: Maybe<string>): string {
  if (!value) return "";
  return map[value] ?? value;
}

function translateRaceName(value: Maybe<string>): string {
  return translateFromMap(raceTranslations as unknown as Record<string, string>, value);
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
  const multiclassLevelSum = pers.multiclasses?.reduce((acc, mc) => acc + mc.classLevel, 0) ?? 0;
  const mainClassLevel = pers.level - multiclassLevelSum;

  const stored = getPersExtras(pers).currentHitDice ?? {};

  const chunks: Array<{ current: number; max: number; die: number }> = [];

  const mainCurrent = typeof stored[String(pers.class.classId)] === "number" ? stored[String(pers.class.classId)] : mainClassLevel;
  chunks.push({
    current: Math.min(mainCurrent, mainClassLevel),
    max: mainClassLevel,
    die: pers.class.hitDie,
  });

  for (const mc of pers.multiclasses ?? []) {
    const mcCurrent = typeof stored[String(mc.classId)] === "number" ? stored[String(mc.classId)] : mc.classLevel;
    chunks.push({
      current: Math.min(mcCurrent, mc.classLevel),
      max: mc.classLevel,
      die: mc.class.hitDie,
    });
  }

  const totalString = chunks.map((c) => `${c.max}d${c.die}`).join(" + ");
  const currentString = chunks.map((c) => `${c.current}d${c.die}`).join(" + ");
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
    field.setText(value ?? "");
  } catch {
    // ignore
  }
}

function tryGetCheckBox(form: PDFForm, name: string) {
  try {
    return form.getCheckBox(name);
  } catch {
    return null;
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

  const { line1, line2 } = splitTextTwoLines(value, font, fontSize, maxWidth);

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
    form.getTextField(name).setText(value ?? "");
  } catch {
    return;
  }
}

function setTextForFirstPresent(form: PDFForm, names: string[], value: string) {
  for (const name of names) {
    try {
      form.getTextField(name).setText(value ?? "");
      return;
    } catch {
      // continue
    }
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
  const skillFieldNames: Partial<Record<Skills, { mod: string[]; prof?: string[] }>> = {
    [Skills.ACROBATICS]: { mod: ["Acrobatics"], prof: ["Check Box 23"] },
    [Skills.ANIMAL_HANDLING]: { mod: ["Animal"], prof: ["Check Box 24"] },
    [Skills.ARCANA]: { mod: ["Arcana"], prof: ["Check Box 25"] },
    [Skills.ATHLETICS]: { mod: ["Athletics"], prof: ["Check Box 26"] },
    [Skills.DECEPTION]: { mod: ["Deception", "Deception "], prof: ["Check Box 27"] },
    [Skills.HISTORY]: { mod: ["History", "History "], prof: ["Check Box 28"] },
    [Skills.INSIGHT]: { mod: ["Insight"], prof: ["Check Box 29"] },
    [Skills.INTIMIDATION]: { mod: ["Intimidation"], prof: ["Check Box 30"] },
    [Skills.INVESTIGATION]: { mod: ["Investigation", "Investigation "], prof: ["Check Box 31"] },
    [Skills.MEDICINE]: { mod: ["Medicine"], prof: ["Check Box 32"] },
    [Skills.NATURE]: { mod: ["Nature"], prof: ["Check Box 33"] },
    [Skills.PERCEPTION]: { mod: ["Perception", "Perception "], prof: ["Check Box 34"] },
    [Skills.PERFORMANCE]: { mod: ["Performance"], prof: ["Check Box 35"] },
    [Skills.PERSUASION]: { mod: ["Persuasion"], prof: ["Check Box 36"] },
    [Skills.RELIGION]: { mod: ["Religion"], prof: ["Check Box 37"] },
    [Skills.SLEIGHT_OF_HAND]: { mod: ["SleightofHand"], prof: ["Check Box 38"] },
    [Skills.STEALTH]: { mod: ["Stealth", "Stealth "], prof: ["Check Box 39"] },
    [Skills.SURVIVAL]: { mod: ["Survival"], prof: ["Check Box 40"] },
  };

  for (const skill of Object.keys(skillFieldNames) as unknown as Skills[]) {
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

function getSpellcastingAbility(pers: CharacterPdfData["pers"]): Ability | null {
  // Use primaryCastingStat from the first class that has one
  const mainClassStat = pers.class?.primaryCastingStat;
  if (mainClassStat) return mainClassStat;

  // Fallback for multiclassing: find any class with casting stat
  for (const mc of pers.multiclasses ?? []) {
    if (mc.class?.primaryCastingStat) return mc.class.primaryCastingStat;
  }

  return null;
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

function formatSpellSlots(standard: number, pact: number): string {
  if (standard > 0 && pact > 0) return `${standard} + ${pact}`;
  if (pact > 0) return String(pact);
  if (standard > 0) return String(standard);
  return "";
}

function fillSpellSheet(form: PDFForm, data: CharacterPdfData, font: PDFFont) {
  const { pers, spellsByLevel } = data;

  // Header
  setTextForFirstPresent(form, ["Spellcasting Class 2", "SpellcastingClass"], buildClassLevelString(pers));
  trySetFontSize(form, "Spellcasting Class 2", 11);

  const ability = getSpellcastingAbility(pers);
  if (ability) {
    const abilityName = abilityTranslations[ability] || ability;
    setTextForFirstPresent(form, ["SpellcastingAbility 2", "Spellcasting Ability 2", "SpellcastingAbility"], abilityName);
    trySetFontSize(form, "SpellcastingAbility 2", 11);
    
    const dc = calculateSpellDC(pers, ability);
    setTextForFirstPresent(form, ["SpellSaveDC  2", "Spell Save DC  2", "SpellSaveDC"], safeText(dc));
    trySetFontSize(form, "SpellSaveDC  2", 11);

    const bonus = calculateSpellAttack(pers, ability);
    setTextForFirstPresent(form, ["SpellAtkBonus 2", "Spell Attack Bonus 2", "SpellAttackBonus"], formatModifier(bonus));
    trySetFontSize(form, "SpellAtkBonus 2", 11);
  }

  const spellFontSize = 9;

  // Spells
  // Рівень 0
  const cantrips = spellsByLevel[0] || [];
  const cantripNames = ["Spells 1014", "Spells 1016", "Spells 1017", "Spells 1018", "Spells 1019", "Spells 1020", "Spells 1021", "Spells 1022"];
  cantrips.forEach((ps, i) => {
    if (i < cantripNames.length) {
      const fieldName = cantripNames[i];
      setTextIfPresent(form, fieldName, ps.spell.name);
      trySetFontSize(form, fieldName, spellFontSize);
    }
  });

  // Рівні 1-9
  const levelNamesMap: Record<number, string[]> = {
    1: ["Spells 1015", "Spells 1023", "Spells 1024", "Spells 1025", "Spells 1026", "Spells 1027", "Spells 1028", "Spells 1029", "Spells 1030", "Spells 1031", "Spells 1032", "Spells 1033"],
    2: ["Spells 1046", "Spells 1034", "Spells 1035", "Spells 1036", "Spells 1037", "Spells 1038", "Spells 1039", "Spells 1040", "Spells 1041", "Spells 1042", "Spells 1043", "Spells 1044", "Spells 1045"],
    3: ["Spells 1048", "Spells 1047", "Spells 1049", "Spells 1050", "Spells 1051", "Spells 1052", "Spells 1053", "Spells 1054", "Spells 1055", "Spells 1056", "Spells 1057", "Spells 1058", "Spells 1059"],
    4: ["Spells 1061", "Spells 1060", "Spells 1062", "Spells 1063", "Spells 1064", "Spells 1065", "Spells 1066", "Spells 1067", "Spells 1068", "Spells 1069", "Spells 1070", "Spells 1071", "Spells 1072"],
    5: ["Spells 1074", "Spells 1073", "Spells 1075", "Spells 1076", "Spells 1077", "Spells 1078", "Spells 1079", "Spells 1080", "Spells 1081"],
    6: ["Spells 1083", "Spells 1082", "Spells 1084", "Spells 1085", "Spells 1086", "Spells 1087", "Spells 1088", "Spells 1089", "Spells 1090"],
    7: ["Spells 1092", "Spells 1091", "Spells 1093", "Spells 1094", "Spells 1095", "Spells 1096", "Spells 1097", "Spells 1098", "Spells 1099"],
    8: ["Spells 10101", "Spells 10100", "Spells 10102", "Spells 10103", "Spells 10104", "Spells 10105", "Spells 10106"],
    9: ["Spells 10108", "Spells 10107", "Spells 10109", "Spells 101010", "Spells 101011", "Spells 101012", "Spells 101013"],
  };

  const slotsTotalNamesMap: Record<number, string[]> = {
    1: ["SlotsTotal 19", "SlotsTotal1"],
    2: ["SlotsTotal 20", "SlotsTotal2"],
    3: ["SlotsTotal 21", "SlotsTotal3"],
    4: ["SlotsTotal 22", "SlotsTotal4"],
    5: ["SlotsTotal 23", "SlotsTotal5"],
    6: ["SlotsTotal 24", "SlotsTotal6"],
    7: ["SlotsTotal 25", "SlotsTotal7"],
    8: ["SlotsTotal 26", "SlotsTotal8"],
    9: ["SlotsTotal 27", "SlotsTotal9"],
  };

  for (let level = 1; level <= 9; level++) {
    const { standard, pact } = getSpellSlots(pers, level);
    const slotsText = formatSpellSlots(standard, pact);
    if (slotsText) {
      setTextForFirstPresent(form, slotsTotalNamesMap[level], slotsText);
    }

    const levelSpells = spellsByLevel[level] || [];
    const names = levelNamesMap[level];
    levelSpells.forEach((ps, i) => {
      if (i < names.length) {
        const fieldName = names[i];
        setTextIfPresent(form, fieldName, ps.spell.name);
        trySetFontSize(form, fieldName, spellFontSize);
      }
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

function getProfAndLang(extras: PersExtraFields) {
  const profs = splitToBulletedLines(safeText(extras.customProficiencies));
  const langs = splitToBulletedLines(safeText(extras.customLanguagesKnown));

  const parts: string[] = [];
  if (profs) {
    parts.push("Володіння (броня/зброя/інструменти):");
    parts.push(profs);
  }
  if (langs) {
    parts.push("Мови:");
    parts.push(langs);
  }

  const profAndLang = parts.join("\n");
  return profAndLang;
}

function splitToBulletedLines(value: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const parts = raw
      .split(/[\n]+/g)
      .map((p) => translatePdfText(p.trim()))
      .filter(Boolean);

  if (parts.length === 0) return "";
  return parts.map((p) => `• ${p}`).join("\n");
}

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
    "Backstory",
    "Notes",
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
        value = translateRaceName(pers.race?.name);
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

  const passivePerception = 10 + calculateFinalSkill(pers, Skills.PERCEPTION).total;
  setTextIfPresent(form, "Passive", safeText(passivePerception));

  for (const name of ["PersonalityTraits", "PersonalityTraits "]) {
    setMultilineTextIfPresent(form, name, safeText(pers.personalityTraits));
  }
  setMultilineTextIfPresent(form, "Ideals", safeText(pers.ideals));
  setMultilineTextIfPresent(form, "Bonds", safeText(pers.bonds));
  setMultilineTextIfPresent(form, "Flaws", safeText(pers.flaws));

  setMultilineTextIfPresent(form, "Backstory", safeText(extras.backstory));
  setMultilineTextIfPresent(form, "Notes", safeText(extras.notes));
  const profAndLang = getProfAndLang(extras);

  for (const name of ["Proficiencies", "Languages", "ProficienciesLang"]) {
    setMultilineTextIfPresent(form, name, profAndLang);
  }

  // Weapons (3 rows)
  fillWeapons(form, pers);

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

  // Bottom of attacks section: show armors + shield status
  const armorAndShield = buildArmorAndShieldText(pers);
  setMultilineTextIfPresent(form, "AttacksSpellcasting", armorAndShield);

  try {
    form.updateFieldAppearances(font);
  } catch {
    return;
  }
}

interface CreatedFieldDef {
  key: OverlayFieldKey;
  value: string;
  needsOverflow?: boolean;
}

function createTextFieldOnPage(
  form: PDFForm,
  page: PDFPage,
  name: string,
  rect: OverlayText,
  value: string,
  font: PDFFont,
  needsTwoLines: boolean = false
) {
  const lineHeight = rect.height;
  let adjustedY = rect.y;
  let adjustedHeight = rect.height;

  if (needsTwoLines) {
    adjustedHeight = rect.height * 2;
    adjustedY = rect.y - rect.height;
  }

  const textField = form.createTextField(name);
  textField.addToPage(page, {
    x: rect.x,
    y: adjustedY,
    width: rect.width,
    height: adjustedHeight,
  });

  if (needsTwoLines) {
    textField.enableMultiline();
  }

  textField.setText(value);

  if (rect.align === "center") {
    textField.setAlignment(TextAlignment.Center);
  } else if (rect.align === "right") {
    textField.setAlignment(TextAlignment.Right);
  } else {
    textField.setAlignment(TextAlignment.Left);
  }
}

function createFieldsFromOverlay(
  pdfDoc: PDFDocument,
  form: PDFForm,
  page: PDFPage,
  data: CharacterPdfData,
  font: PDFFont
) {
  const { pers } = data;
  const extras = getPersExtras(pers);

  const fieldDefs: CreatedFieldDef[] = [
    { key: "characterName", value: safeText(pers.name), needsOverflow: true },
    { key: "classLevel", value: buildClassLevelString(pers), needsOverflow: true },
    { key: "background", value: safeText(pers.background?.name) },
    { key: "playerName", value: safeText(pers.user?.name ?? pers.user?.email), needsOverflow: true },
    { key: "race", value: safeText(pers.race?.name), needsOverflow: true },
    { key: "alignment", value: safeText(extras.alignment) },
    { key: "xp", value: safeText(extras.xp) },
    { key: "ac", value: safeText(calculateFinalAC(pers)) },
    { key: "initiative", value: formatModifier(calculateFinalInitiative(pers)) },
    { key: "speed", value: safeText(calculateFinalSpeed(pers)) },
    { key: "proficiencyBonus", value: formatModifier(calculateFinalProficiency(pers)) },
    { key: "hpMax", value: safeText(calculateFinalMaxHP(pers)) },
    // Don't print current HP and temporary HP
    // { key: "hpCurrent", value: safeText(pers.currentHp) },
    // { key: "hpTemp", value: safeText(extras.tempHp ?? 0) },
  ];

  const abilities: Ability[] = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
  for (const ability of abilities) {
    const score = calculateFinalStat(pers, ability);
    const mod = calculateFinalModifier(pers, ability);
    fieldDefs.push({ key: `stat:${ability}:score`, value: safeText(score) });
    fieldDefs.push({ key: `stat:${ability}:mod`, value: formatModifier(mod) });
  }

  for (const def of fieldDefs) {
    const rect = CHARACTER_SHEET_OVERLAY[def.key];
    if (!rect) continue;
    if (rect.pageIndex !== 0) continue;

    const fontSize = rect.size ?? 10;
    const textWidth = font.widthOfTextAtSize(def.value, fontSize);
    const needsTwoLines = def.needsOverflow && textWidth > rect.width;

    let valueToSet = def.value;
    if (needsTwoLines) {
      const { line1, line2 } = splitTextTwoLines(def.value, font, fontSize, rect.width);
      valueToSet = line2 ? `${line1}\n${line2}` : line1;
    }

    createTextFieldOnPage(form, page, def.key, rect, valueToSet, font, needsTwoLines);
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

  const spellsByLevel = await withStep(
    "compute.groupSpellsByLevel",
    (phase, fields) => (phase === "error" ? log.error("step", fields) : log.info("step", fields)),
    async () => groupPersSpellsByLevel(pers.persSpells ?? [])
  );

  log.info("data.ready", {
    characterName: pers.name,
    spellsCount: (pers.persSpells ?? []).length,
    featuresCount:
      (features?.passive?.length ?? 0) +
      (features?.actions?.length ?? 0) +
      (features?.bonusActions?.length ?? 0) +
      (features?.reactions?.length ?? 0),
    magicItemsCount: (pers.magicItems ?? []).length,
  });

  const data: CharacterPdfData = { pers, features, spellsByLevel };

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

  const strictSections = process.env.PDF_STRICT_SECTIONS === "1";

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

  // 1.5 Мерджимо DETAILS
  if (normalized.sections.includes("DETAILS")) {
    try {
      const detailsPath = path.resolve(process.cwd(), "public", "CharacterDetails.pdf");
      const detailsBytes = await fs.readFile(detailsPath);
      const detailsDoc = await PDFDocument.load(detailsBytes);
      const pages = await pdfDoc.copyPages(detailsDoc, detailsDoc.getPageIndices());
      pages.forEach((p) => pdfDoc.addPage(p));
      log.info("details.added", { pagesCount: pages.length });
    } catch (err) {
      log.warn("details.failed", { err });
      if (strictSections) throw err;
    }
  }

  // 2. Мерджимо SPELL_SHEET
  if (normalized.sections.includes("SPELL_SHEET")) {
    try {
      const spellSheetPath = path.resolve(process.cwd(), "public", "CharacterSpells_fixed.pdf");
      const spellSheetBytes = await fs.readFile(spellSheetPath);
      const spellSheetDoc = await PDFDocument.load(spellSheetBytes);

      spellSheetDoc.registerFontkit(fontkit);
      const regularPath = path.resolve(process.cwd(), "public", "fonts", "NotoSans-Regular.ttf");
      const regularBytes = await fs.readFile(regularPath);
      const spellSheetFont = await spellSheetDoc.embedFont(regularBytes, { subset: true });
      
      const form = spellSheetDoc.getForm();
      fillSpellSheet(form, data, spellSheetFont);

      if (normalized.flattenCharacterSheet) {
        try {
          // IMPORTANT: must provide font to updateFieldAppearances or set as default on form
          // so flatten() can render Cyrillic correctly.
          form.updateFieldAppearances(spellSheetFont);
          form.flatten();
        } catch (err) {
          log.warn("spellSheet.flatten.failed", { err });
        }
      }

      const [spellSheetPage] = await pdfDoc.copyPages(spellSheetDoc, [0]);
      pdfDoc.addPage(spellSheetPage);
      log.info("spellSheet.added");
    } catch (err) {
      log.warn("spellSheet.failed", { err });
      if (strictSections) throw err;
    }
  }

  // 3. Мерджимо FEATURES (як і було)
  if (normalized.sections.includes("FEATURES")) {
    const hasAnyFeatureItems =
      (data.features?.passive?.length ?? 0) +
        (data.features?.actions?.length ?? 0) +
        (data.features?.bonusActions?.length ?? 0) +
        (data.features?.reactions?.length ?? 0) >
      0;

    if (hasAnyFeatureItems) {
      try {
        log.info("features.start", {
          passive: data.features?.passive?.length ?? 0,
          actions: data.features?.actions?.length ?? 0,
          bonusActions: data.features?.bonusActions?.length ?? 0,
          reactions: data.features?.reactions?.length ?? 0,
        });

        const featuresPdfBytes = await generateFeaturesPdfBytes(
          {
          characterName: data.pers.name ?? "Character",
          features: data.features,
          },
          { jobId: logCtx.jobId, tag: "features" }
        );
        log.info("features.generated", { bytes: featuresPdfBytes.byteLength, bytesFmt: formatBytes(featuresPdfBytes.byteLength) });
        const featuresDoc = await PDFDocument.load(featuresPdfBytes);
        const pages = await pdfDoc.copyPages(featuresDoc, featuresDoc.getPageIndices());
        pages.forEach((p) => pdfDoc.addPage(p));
      } catch (err) {
        log.warn("features.failed", { err });
        if (strictSections) throw err;
      }
    }
  }

  // 3. Мерджимо SPELLS (як і було)
  if (normalized.sections.includes("SPELLS")) {
    const spellIds = (data.pers.persSpells ?? []).map(ps => ps.spellId).filter((id): id is number => id != null);
    if (spellIds.length > 0) {
      try {
        log.info("spells.start", { spellIdsCount: spellIds.length });
        const spellsPdfBytes = await generateSpellsPdfBytes(spellIds, { jobId: logCtx.jobId, tag: "spells" });
        log.info("spells.generated", { bytes: spellsPdfBytes.byteLength, bytesFmt: formatBytes(spellsPdfBytes.byteLength) });
        const spellsDoc = await PDFDocument.load(spellsPdfBytes);
        const pages = await pdfDoc.copyPages(spellsDoc, spellsDoc.getPageIndices());
        pages.forEach((p) => pdfDoc.addPage(p));
      } catch (err) {
        log.warn("spells.failed", { err });
        if (strictSections) throw err;
      }
    }
  }

  // 4. Мерджимо MAGIC ITEMS
  if (normalized.sections.includes("MAGIC_ITEMS")) {
    const magicItemIds = (data.pers?.magicItems ?? [])
      .map((mi) => mi.magicItemId)
      .filter((id): id is number => id != null);

    if (magicItemIds.length > 0) {
      try {
        log.info("magicItems.start", { magicItemIdsCount: magicItemIds.length });
        const magicItemsPdfBytes = await generateMagicItemsPdfBytes(magicItemIds, { jobId: logCtx.jobId, tag: "magicItems" });
        log.info("magicItems.generated", { bytes: magicItemsPdfBytes.byteLength, bytesFmt: formatBytes(magicItemsPdfBytes.byteLength) });
        const magicItemsDoc = await PDFDocument.load(magicItemsPdfBytes);
        const pages = await pdfDoc.copyPages(magicItemsDoc, magicItemsDoc.getPageIndices());
        pages.forEach((p) => pdfDoc.addPage(p));
      } catch (err) {
        log.warn("magicItems.failed", { err });
        if (strictSections) throw err;
      }
    }
  }

  const out = await withStep(
    "pdf.save",
    (phase, fields) => (phase === "error" ? log.error("step", fields) : log.info("step", { ...fields, pages: pdfDoc.getPageCount() })),
    async () => pdfDoc.save()
  );

  log.info("result", { bytes: out.byteLength, bytesFmt: formatBytes(out.byteLength), pages: pdfDoc.getPageCount() });
  return out;
}