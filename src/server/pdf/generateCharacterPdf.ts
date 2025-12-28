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
} from "@/lib/logic/bonus-calculator";
import { formatModifier } from "@/lib/logic/utils";
import { Ability, Skills, SkillProficiencyType } from "@prisma/client";
import { PDFDocument, type PDFFont, type PDFPage, type PDFForm, TextAlignment } from "pdf-lib";
import * as fontkit from "@pdf-lib/fontkit";

import type { CharacterPdfData, PersSpellWithSpell, PrintConfig, PrintSection } from "./types";
import { CHARACTER_SHEET_OVERLAY, type OverlayFieldKey, type OverlayText } from "./overlayLayout";
import { generateSpellsPdfBytes } from "./spellsPdf";
import { generateFeaturesPdfBytes } from "./featuresPdf";

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

const DEFAULT_SECTIONS: PrintSection[] = ["CHARACTER", "FEATURES", "SPELLS"];

function safeText(value: Maybe<string | number>): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function normalizePrintConfig(config: PrintConfig | null | undefined): PrintConfig {
  const sections = (config?.sections?.length ? config.sections : DEFAULT_SECTIONS).filter(Boolean);
  return { sections };
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
  parts.push(`${pers.class.name} ${mainClassLevel}`);

  for (const mc of pers.multiclasses ?? []) {
    parts.push(`${mc.class.name} ${mc.classLevel}`);
  }

  return parts.join(" / ");
}

function buildHitDiceInfoFromPers(pers: CharacterPdfData["pers"]): { totalString: string; currentString: string } {
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
  return { totalString, currentString };
}

function tryGetTextField(form: PDFForm, name: string) {
  try {
    return form.getTextField(name);
  } catch {
    return null;
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
  const field = tryGetTextField(form, name);
  if (!field) return;
  field.setText(value ?? "");
}

function setCheckIfPresent(form: PDFForm, name: string, checked: boolean) {
  const field = tryGetCheckBox(form, name);
  if (!field) return;
  if (checked) field.check();
  else field.uncheck();
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
    DEX: ["DEXmod", "DexterityMod"],
    CON: ["CONmod", "ConstitutionMod"],
    INT: ["INTmod", "IntelligenceMod"],
    WIS: ["WISmod", "WisdomMod"],
    CHA: ["CHAmod", "CharismaMod"],
  } as const;

  const scoreNames = scoreFieldCandidates[ability] ?? [];
  const modNames = modFieldCandidates[ability] ?? [];

  for (const name of scoreNames) setTextIfPresent(form, name, safeText(score));
  for (const name of modNames) setTextIfPresent(form, name, formatModifier(mod));
}

function fillSavingThrows(form: PDFForm, pers: CharacterPdfData["pers"]) {
  const classSavingThrows = pers.class.savingThrows ?? [];
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
    const total = calculateFinalSave(pers, ability, classSavingThrows);
    for (const name of mapping[ability].value) setTextIfPresent(form, name, formatModifier(total));

    const isProficient =
      classSavingThrows.includes(ability) ||
      (Array.isArray(extras.additionalSaveProficiencies) && extras.additionalSaveProficiencies.includes(ability));
    for (const chk of mapping[ability].proficient ?? []) setCheckIfPresent(form, chk, Boolean(isProficient));
  }
}

function fillSkills(form: PDFForm, pers: CharacterPdfData["pers"]) {
  const skillFieldNames: Partial<Record<Skills, { mod: string[]; prof?: string[] }>> = {
    [Skills.ACROBATICS]: { mod: ["Acrobatics"], prof: ["Check Box 23"] },
    [Skills.ANIMAL_HANDLING]: { mod: ["Animal"], prof: ["Check Box 24"] },
    [Skills.ARCANA]: { mod: ["Arcana"], prof: ["Check Box 25"] },
    [Skills.ATHLETICS]: { mod: ["Athletics"], prof: ["Check Box 26"] },
    [Skills.DECEPTION]: { mod: ["Deception"], prof: ["Check Box 27"] },
    [Skills.HISTORY]: { mod: ["History"], prof: ["Check Box 28"] },
    [Skills.INSIGHT]: { mod: ["Insight"], prof: ["Check Box 29"] },
    [Skills.INTIMIDATION]: { mod: ["Intimidation"], prof: ["Check Box 30"] },
    [Skills.INVESTIGATION]: { mod: ["Investigation"], prof: ["Check Box 31"] },
    [Skills.MEDICINE]: { mod: ["Medicine"], prof: ["Check Box 32"] },
    [Skills.NATURE]: { mod: ["Nature"], prof: ["Check Box 33"] },
    [Skills.PERCEPTION]: { mod: ["Perception"], prof: ["Check Box 34"] },
    [Skills.PERFORMANCE]: { mod: ["Performance"], prof: ["Check Box 35"] },
    [Skills.PERSUASION]: { mod: ["Persuasion"], prof: ["Check Box 36"] },
    [Skills.RELIGION]: { mod: ["Religion"], prof: ["Check Box 37"] },
    [Skills.SLEIGHT_OF_HAND]: { mod: ["SleightofHand"], prof: ["Check Box 38"] },
    [Skills.STEALTH]: { mod: ["Stealth"], prof: ["Check Box 39"] },
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
    setCheckIfPresent(form, `DeathSaveSuccess${i}`, i <= successes);
    setCheckIfPresent(form, `DeathSaveFail${i}`, i <= failures);
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

  for (const { fieldName, maxWidth, fontSize } of OVERFLOW_FIELDS) {
    let value = "";
    switch (fieldName) {
      case "CharacterName":
        value = safeText(pers.name);
        break;
      case "ClassLevel":
        value = buildClassLevelString(pers);
        break;
      case "Race":
        value = safeText(pers.race?.name);
        break;
      case "PlayerName":
        value = safeText(pers.user?.name ?? pers.user?.email);
        break;
    }
    setTextFieldWithOverflow(form, fieldName, value, font, fontSize, maxWidth);
  }

  setTextIfPresent(form, "Background", safeText(pers.background?.name));
  setTextIfPresent(form, "Alignment", safeText(extras.alignment));
  setTextIfPresent(form, "XP", safeText(extras.xp));

  for (const ability of [Ability.STR, Ability.DEX, Ability.CON, Ability.INT, Ability.WIS, Ability.CHA]) {
    const score = calculateFinalStat(pers, ability);
    const mod = calculateFinalModifier(pers, ability);
    fillAbility(form, ability, score, mod);
  }

  setTextIfPresent(form, "ProficiencyBonus", formatModifier(calculateFinalProficiency(pers)));

  setTextIfPresent(form, "AC", safeText(calculateFinalAC(pers)));
  setTextIfPresent(form, "Initiative", formatModifier(calculateFinalInitiative(pers)));
  setTextIfPresent(form, "Speed", safeText(calculateFinalSpeed(pers)));

  setTextIfPresent(form, "HPMax", safeText(calculateFinalMaxHP(pers)));
  setTextIfPresent(form, "HPCurrent", safeText(pers.currentHp));
  setTextIfPresent(form, "HPTemp", safeText(extras.tempHp ?? 0));

  const hitDice = buildHitDiceInfoFromPers(pers);
  setTextIfPresent(form, "HitDiceTotal", hitDice.totalString);
  setTextIfPresent(form, "HitDiceCurrent", hitDice.currentString);

  fillDeathSaves(form, pers);
  fillSavingThrows(form, pers);
  fillSkills(form, pers);

  setTextIfPresent(form, "PersonalityTraits", safeText(pers.personalityTraits));
  setTextIfPresent(form, "Ideals", safeText(pers.ideals));
  setTextIfPresent(form, "Bonds", safeText(pers.bonds));
  setTextIfPresent(form, "Flaws", safeText(pers.flaws));

  setTextIfPresent(form, "Backstory", safeText(extras.backstory));
  setTextIfPresent(form, "Notes", safeText(extras.notes));
  setTextIfPresent(form, "Proficiencies", safeText(extras.customProficiencies));
  setTextIfPresent(form, "Languages", safeText(extras.customLanguagesKnown));
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
    { key: "hpCurrent", value: safeText(pers.currentHp) },
    { key: "hpTemp", value: safeText(extras.tempHp ?? 0) },
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
  config: PrintConfig
): Promise<Uint8Array> {
  const normalized = normalizePrintConfig(config);

  const session = await auth();
  if (!session?.user?.email) throw new Error("Unauthorized");
  if (session.user.email !== userEmail) throw new Error("Unauthorized");

  const pers = await getPersById(persId);
  if (!pers) throw new Error("Not found");

  const features = await getCharacterFeaturesGrouped(persId);
  if (!features) throw new Error("Not found");

  const spellsByLevel = groupPersSpellsByLevel(pers.persSpells ?? []);
  const data: CharacterPdfData = { pers, features, spellsByLevel };

  const fs = await import("fs/promises");
  const path = await import("path");

  const templatePath = path.resolve(process.cwd(), "public", "CharacterSheet.pdf");
  const existingPdfBytes = await fs.readFile(templatePath);

  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  const { regular: notoSansRegular, bold: notoSansBold } = await embedNotoSansFonts(pdfDoc);

  if (normalized.sections.includes("CHARACTER")) {
    const form = pdfDoc.getForm();
    const existingFields = form.getFields();

    if (existingFields.length > 0) {
      fillFirstPageUsingExistingFields(form, data, notoSansRegular);
      form.updateFieldAppearances(notoSansRegular);
    } else {
      const pages = pdfDoc.getPages();
      if (pages.length > 0) {
        createFieldsFromOverlay(pdfDoc, form, pages[0], data, notoSansRegular);
        form.updateFieldAppearances(notoSansRegular);
      }
    }
  }

  if (normalized.sections.includes("FEATURES")) {
    const allFeatures = Object.values(features).flat();
    if (allFeatures.length > 0) {
      try {
        const featuresPdfBytes = await generateFeaturesPdfBytes({
          characterName: pers.name ?? "Character",
          features,
        });

        const featuresPdfDoc = await PDFDocument.load(featuresPdfBytes);
        const copiedPages = await pdfDoc.copyPages(featuresPdfDoc, featuresPdfDoc.getPageIndices());
        for (const page of copiedPages) {
          pdfDoc.addPage(page);
        }
      } catch (err) {
        console.error("Failed to generate features PDF:", err);
      }
    }
  }

  if (normalized.sections.includes("SPELLS")) {
    const spellIds = (pers.persSpells ?? []).map((ps) => ps.spellId).filter((id): id is number => id != null);
    if (spellIds.length > 0) {
      try {
        const spellsPdfBytes = await generateSpellsPdfBytes(spellIds);

        const spellsPdfDoc = await PDFDocument.load(spellsPdfBytes);
        const copiedPages = await pdfDoc.copyPages(spellsPdfDoc, spellsPdfDoc.getPageIndices());
        for (const page of copiedPages) {
          pdfDoc.addPage(page);
        }
      } catch (err) {
        console.error("Failed to generate spells PDF:", err);
      }
    }
  }

  return pdfDoc.save();
}
