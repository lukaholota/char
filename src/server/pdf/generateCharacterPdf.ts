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
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type PDFForm } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

import type { CharacterPdfData, PersSpellWithSpell, PrintConfig, PrintSection } from "./types";

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

// Layout constants for rendered (non-template) pages.
const PAGE_MARGIN = 48; // 2/3 inch-ish.
const HEADER_FONT_SIZE = 18;
const SUBHEADER_FONT_SIZE = 13;
const BODY_FONT_SIZE = 10;
const BODY_LINE_HEIGHT = 12;
const SECTION_GAP = 14;
const ITEM_GAP = 10;

interface PageContext {
  page: PDFPage;
  x: number;
  y: number;
  margin: number;
  width: number;
  height: number;
}

interface TextOptions {
  font: PDFFont;
  size: number;
  color?: ReturnType<typeof rgb>;
  maxWidth: number;
  lineHeight: number;
}

interface FeatureGroup {
  title: string;
  items: Array<{
    name: string;
    sourceName: string;
    description: string;
    usesRemaining?: number | null;
    usesPer?: number | null;
    restType?: string | null;
  }>;
}

function safeText(value: Maybe<string | number>): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function isAsciiOnly(text: string): boolean {
  // StandardFonts in pdf-lib can only encode WinAnsi (effectively limited).
  // If we detect non-ASCII, we should either embed a Unicode font or sanitize.
  return /^[\x00-\x7F]*$/.test(text);
}

function sanitizeForStandardFont(text: string): string {
  // Best-effort: preserve ASCII and replace anything else.
  // TODO: Embed NotoSans (or other) TTF in public/fonts and use it for true Unicode.
  return text.replace(/[^\x00-\x7F]/g, "?");
}

async function maybeEmbedUnicodeFonts(pdfDoc: PDFDocument): Promise<{ regular: PDFFont; bold: PDFFont } | null> {
  // Optional: If you add these files, we will use them automatically for full Unicode.
  // - public/fonts/NotoSans-Regular.ttf
  // - public/fonts/NotoSans-Bold.ttf
  try {
    const fs = await import("fs/promises");
    const path = await import("path");

    const regularPath = path.resolve(process.cwd(), "public", "fonts", "NotoSans-Regular.ttf");
    const boldPath = path.resolve(process.cwd(), "public", "fonts", "NotoSans-Bold.ttf");

    const [regularBytes, boldBytes] = await Promise.all([
      fs.readFile(regularPath),
      fs.readFile(boldPath),
    ]);

    pdfDoc.registerFontkit(fontkit);
    const regular = await pdfDoc.embedFont(regularBytes);
    const bold = await pdfDoc.embedFont(boldBytes);
    return { regular, bold };
  } catch {
    return null;
  }
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

function createPageWithMargin(pdfDoc: PDFDocument, templateSize?: { width: number; height: number }): PageContext {
  const width = templateSize?.width ?? 612; // Letter default
  const height = templateSize?.height ?? 792;
  const page = pdfDoc.addPage([width, height]);
  return {
    page,
    margin: PAGE_MARGIN,
    x: PAGE_MARGIN,
    y: height - PAGE_MARGIN,
    width,
    height,
  };
}

function ensureSpace(ctx: PageContext, neededHeight: number, pdfDoc: PDFDocument, templateSize?: { width: number; height: number }): PageContext {
  if (ctx.y - neededHeight >= ctx.margin) return ctx;
  return createPageWithMargin(pdfDoc, templateSize);
}

function drawTextLine(ctx: PageContext, text: string, opts: Omit<TextOptions, "maxWidth">): PageContext {
  const color = opts.color ?? rgb(0, 0, 0);
  ctx.page.drawText(text, {
    x: ctx.x,
    y: ctx.y - opts.size,
    size: opts.size,
    font: opts.font,
    color,
  });
  ctx.y -= opts.lineHeight;
  return ctx;
}

function wrapTextIntoLines(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/g).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    const width = font.widthOfTextAtSize(next, size);
    if (width <= maxWidth) {
      line = next;
      continue;
    }

    if (line) lines.push(line);

    // If a single word is longer than maxWidth, hard-break it.
    if (font.widthOfTextAtSize(word, size) > maxWidth) {
      let chunk = "";
      for (const ch of word) {
        const c2 = chunk + ch;
        if (font.widthOfTextAtSize(c2, size) <= maxWidth) {
          chunk = c2;
        } else {
          if (chunk) lines.push(chunk);
          chunk = ch;
        }
      }
      line = chunk;
    } else {
      line = word;
    }
  }

  if (line) lines.push(line);
  return lines;
}

function drawWrappedText(
  ctx: PageContext,
  pdfDoc: PDFDocument,
  text: string,
  opts: TextOptions,
  templateSize?: { width: number; height: number },
  supportsUnicode: boolean = false
): PageContext {
  const color = opts.color ?? rgb(0, 0, 0);
  const sanitized = supportsUnicode || isAsciiOnly(text) ? text : sanitizeForStandardFont(text);
  const lines = wrapTextIntoLines(sanitized, opts.font, opts.size, opts.maxWidth);

  for (const line of lines) {
    ctx = ensureSpace(ctx, opts.lineHeight + 2, pdfDoc, templateSize);
    ctx.page.drawText(line, {
      x: ctx.x,
      y: ctx.y - opts.size,
      size: opts.size,
      font: opts.font,
      color,
    });
    ctx.y -= opts.lineHeight;
  }

  return ctx;
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

function setTextIfPresent(form: PDFForm, name: string, value: string) {
  const field = tryGetTextField(form, name);
  if (!field) return;
  field.setText(value ?? "");
  try {
    field.enableReadOnly();
    field.disableReadOnly();
  } catch {
    // Some field implementations may not support readOnly toggles.
  }
}

function setCheckIfPresent(form: PDFForm, name: string, checked: boolean) {
  const field = tryGetCheckBox(form, name);
  if (!field) return;
  if (checked) field.check();
  else field.uncheck();
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

function fillAbility(form: PDFForm, ability: Ability, score: number, mod: number) {
  // These are common field names in many fillable 5e sheets.
  // Your template might differ; if so, update these mappings.
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

  // Common names in some sheets: DeathSaveSuccess1..3, DeathSaveFail1..3
  for (let i = 1; i <= 3; i++) {
    setCheckIfPresent(form, `DeathSaveSuccess${i}`, i <= successes);
    setCheckIfPresent(form, `DeathSaveFail${i}`, i <= failures);
  }
}

function fillFirstPage(form: PDFForm, data: CharacterPdfData) {
  const { pers } = data;
  const extras = getPersExtras(pers);

  // Identity
  setTextIfPresent(form, "CharacterName", safeText(pers.name));
  setTextIfPresent(form, "ClassLevel", buildClassLevelString(pers));
  setTextIfPresent(form, "Background", safeText(pers.background?.name));
  setTextIfPresent(form, "PlayerName", safeText(pers.user?.name ?? pers.user?.email));
  setTextIfPresent(form, "Race", safeText(pers.race?.name));
  setTextIfPresent(form, "Alignment", safeText(extras.alignment));
  setTextIfPresent(form, "XP", safeText(extras.xp));

  // Ability scores & modifiers
  for (const ability of [Ability.STR, Ability.DEX, Ability.CON, Ability.INT, Ability.WIS, Ability.CHA]) {
    const score = calculateFinalStat(pers, ability);
    const mod = calculateFinalModifier(pers, ability);
    fillAbility(form, ability, score, mod);
  }

  // Proficiency Bonus
  setTextIfPresent(form, "ProficiencyBonus", formatModifier(calculateFinalProficiency(pers)));

  // AC / Initiative / Speed
  setTextIfPresent(form, "AC", safeText(calculateFinalAC(pers)));
  setTextIfPresent(form, "Initiative", formatModifier(calculateFinalInitiative(pers)));
  setTextIfPresent(form, "Speed", safeText(calculateFinalSpeed(pers)));

  // HP
  setTextIfPresent(form, "HPMax", safeText(calculateFinalMaxHP(pers)));
  setTextIfPresent(form, "HPCurrent", safeText(pers.currentHp));
  setTextIfPresent(form, "HPTemp", safeText(extras.tempHp ?? 0));

  // Hit dice
  const hitDice = buildHitDiceInfoFromPers(pers);
  setTextIfPresent(form, "HitDiceTotal", hitDice.totalString);
  setTextIfPresent(form, "HitDiceCurrent", hitDice.currentString);

  // Death saves
  fillDeathSaves(form, pers);

  // Saves & skills
  fillSavingThrows(form, pers);
  fillSkills(form, pers);

  // Personality & backstory
  setTextIfPresent(form, "PersonalityTraits", safeText(pers.personalityTraits));
  setTextIfPresent(form, "Ideals", safeText(pers.ideals));
  setTextIfPresent(form, "Bonds", safeText(pers.bonds));
  setTextIfPresent(form, "Flaws", safeText(pers.flaws));

  setTextIfPresent(form, "Backstory", safeText(extras.backstory));
  setTextIfPresent(form, "Notes", safeText(extras.notes));

  // Optional: custom proficiencies/languages if your template has fields.
  setTextIfPresent(form, "Proficiencies", safeText(extras.customProficiencies));
  setTextIfPresent(form, "Languages", safeText(extras.customLanguagesKnown));
}

function buildFeatureGroups(data: CharacterPdfData): FeatureGroup[] {
  const allItems = Object.values(data.features).flat();
  const byKey = new Map<string, (typeof allItems)[number]>();
  for (const item of allItems) {
    if (!byKey.has(item.key)) byKey.set(item.key, item);
  }

  const items = [...byKey.values()];

  const fromSource = (sources: Array<(typeof items)[number]["source"]>) =>
    items
      .filter((i) => sources.includes(i.source))
      .map((i) => ({
        name: i.name,
        sourceName: i.sourceName,
        description: i.description,
        usesRemaining: i.usesRemaining ?? null,
        usesPer: i.usesPer ?? null,
        restType: i.restType ?? null,
      }));

  const groups: FeatureGroup[] = [
    {
      title: "Class & Subclass Features",
      items: fromSource(["CLASS", "SUBCLASS"]),
    },
    {
      title: "Race & Subrace Features",
      items: fromSource(["RACE", "SUBRACE"]),
    },
    {
      title: "Background Features",
      items: fromSource(["BACKGROUND"]),
    },
    {
      title: "Feats",
      items: fromSource(["FEAT"]),
    },
    {
      title: "Other Features",
      items: fromSource(["PERS", "CHOICE", "RACE_CHOICE"]),
    },
  ];

  return groups.filter((g) => g.items.length > 0);
}

async function renderFeaturesSection(
  pdfDoc: PDFDocument,
  data: CharacterPdfData,
  fonts: { regular: PDFFont; bold: PDFFont },
  templateSize?: { width: number; height: number },
  supportsUnicode: boolean = false
) {
  let ctx = createPageWithMargin(pdfDoc, templateSize);
  const maxWidth = ctx.width - ctx.margin * 2;

  ctx = drawTextLine(ctx, `Features — ${sanitizeForStandardFont(data.pers.name ?? "")}`, {
    font: fonts.bold,
    size: HEADER_FONT_SIZE,
    lineHeight: HEADER_FONT_SIZE + 8,
  });
  ctx.y -= SECTION_GAP;

  const groups = buildFeatureGroups(data);

  for (const group of groups) {
    ctx = ensureSpace(ctx, SUBHEADER_FONT_SIZE + 10, pdfDoc, templateSize);
    ctx = drawTextLine(ctx, sanitizeForStandardFont(group.title), {
      font: fonts.bold,
      size: SUBHEADER_FONT_SIZE,
      lineHeight: SUBHEADER_FONT_SIZE + 6,
    });

    for (const item of group.items) {
      const headerParts = [sanitizeForStandardFont(item.name)];
      if (item.sourceName && item.sourceName !== item.name) headerParts.push(`(${sanitizeForStandardFont(item.sourceName)})`);
      if (typeof item.usesPer === "number") {
        const used = typeof item.usesRemaining === "number" ? `${item.usesRemaining}/${item.usesPer}` : `/${item.usesPer}`;
        headerParts.push(`[${used}${item.restType ? ` ${item.restType}` : ""}]`);
      }

      ctx = ensureSpace(ctx, BODY_LINE_HEIGHT * 2, pdfDoc, templateSize);
      ctx = drawWrappedText(
        ctx,
        pdfDoc,
        headerParts.join(" "),
        {
          font: fonts.bold,
          size: BODY_FONT_SIZE,
          maxWidth,
          lineHeight: BODY_LINE_HEIGHT,
          color: rgb(0, 0, 0),
        },
        templateSize,
        supportsUnicode
      );

      const description = item.description?.trim() ?? "";
      if (description) {
        ctx = drawWrappedText(
          ctx,
          pdfDoc,
          description,
          {
            font: fonts.regular,
            size: BODY_FONT_SIZE,
            maxWidth,
            lineHeight: BODY_LINE_HEIGHT,
            color: rgb(0.12, 0.12, 0.12),
          },
          templateSize,
          supportsUnicode
        );
      }

      ctx.y -= ITEM_GAP;
    }

    ctx.y -= SECTION_GAP;
  }
}

function levelLabel(level: number): string {
  if (level === 0) return "Level 0 (Cantrips)";
  return `Level ${level}`;
}

function buildSpellOneLiner(ps: PersSpellWithSpell): string {
  const s = ps.spell;
  if (!s) return "";

  const school = s.school ? `${s.school}` : "";
  const ritual = s.hasRitual ? "R" : "";
  const conc = s.hasConcentration ? "C" : "";
  const tags = [ritual, conc].filter(Boolean).join("/");

  const parts = [
    s.name,
    school ? `— ${school}${tags ? ` (${tags})` : ""}` : (tags ? `— (${tags})` : ""),
    `, ${s.castingTime}`,
    `, ${s.range}`,
    s.components ? `, ${s.components}` : "",
    `, ${s.duration}`,
  ].join("");

  return parts;
}

async function renderSpellsSection(
  pdfDoc: PDFDocument,
  data: CharacterPdfData,
  fonts: { regular: PDFFont; bold: PDFFont },
  templateSize?: { width: number; height: number },
  supportsUnicode: boolean = false
) {
  let ctx = createPageWithMargin(pdfDoc, templateSize);
  const maxWidth = ctx.width - ctx.margin * 2;

  ctx = drawTextLine(ctx, `Spells — ${sanitizeForStandardFont(data.pers.name ?? "")}`, {
    font: fonts.bold,
    size: HEADER_FONT_SIZE,
    lineHeight: HEADER_FONT_SIZE + 8,
  });
  ctx.y -= SECTION_GAP;

  const levels = Object.keys(data.spellsByLevel)
    .map(Number)
    .sort((a, b) => a - b);

  for (const level of levels) {
    const spells = data.spellsByLevel[level] ?? [];
    if (spells.length === 0) continue;

    ctx = ensureSpace(ctx, SUBHEADER_FONT_SIZE + 10, pdfDoc, templateSize);
    ctx = drawTextLine(ctx, levelLabel(level), {
      font: fonts.bold,
      size: SUBHEADER_FONT_SIZE,
      lineHeight: SUBHEADER_FONT_SIZE + 6,
    });

    for (const ps of spells) {
      const oneLine = buildSpellOneLiner(ps);
      if (oneLine) {
        ctx = drawWrappedText(
          ctx,
          pdfDoc,
          oneLine,
          {
            font: fonts.bold,
            size: BODY_FONT_SIZE,
            maxWidth,
            lineHeight: BODY_LINE_HEIGHT,
          },
          templateSize,
          supportsUnicode
        );
      }

      const description = ps.spell?.description?.trim() ?? "";
      if (description) {
        ctx = drawWrappedText(
          ctx,
          pdfDoc,
          description,
          {
            font: fonts.regular,
            size: BODY_FONT_SIZE,
            maxWidth,
            lineHeight: BODY_LINE_HEIGHT,
            color: rgb(0.12, 0.12, 0.12),
          },
          templateSize,
          supportsUnicode
        );
      }

      ctx.y -= ITEM_GAP;
    }

    ctx.y -= SECTION_GAP;
  }
}

export async function generateCharacterPdf(
  persId: number,
  userEmail: string,
  config: PrintConfig
): Promise<Uint8Array> {
  const normalized = normalizePrintConfig(config);

  // 1) Authorization
  const session = await auth();
  if (!session?.user?.email) throw new Error("Unauthorized");
  if (session.user.email !== userEmail) throw new Error("Unauthorized");

  // 2) Gather data (reuses existing include/auth logic)
  const pers = await getPersById(persId);
  if (!pers) throw new Error("Not found");

  const features = await getCharacterFeaturesGrouped(persId);
  if (!features) throw new Error("Not found");

  const spellsByLevel = groupPersSpellsByLevel(pers.persSpells ?? []);

  const data: CharacterPdfData = { pers, features, spellsByLevel };

  // 3) Load template
  const fs = await import("fs/promises");
  const path = await import("path");

  const templatePath = path.resolve(process.cwd(), "public", "CharacterSheet.pdf");
  const existingPdfBytes = await fs.readFile(templatePath);

  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  const templatePages = pdfDoc.getPages();
  const templateSize = templatePages.length
    ? { width: templatePages[0].getWidth(), height: templatePages[0].getHeight() }
    : undefined;

  // 4) Fill template form fields (if any)
  if (normalized.sections.includes("CHARACTER")) {
    // NOTE: The provided CharacterSheet.pdf in this workspace currently appears to have 0 AcroForm fields.
    // If your chosen template is a proper AcroForm PDF, pdf-lib will populate fields and keep them editable.
    try {
      const form = pdfDoc.getForm();
      const fieldCount = form.getFields().length;
      if (fieldCount > 0) {
        fillFirstPage(form, data);
      }
      // Do NOT flatten to keep fields editable.
    } catch {
      // If template has no AcroForm or is incompatible, we still generate extra pages.
    }
  }

  // 5/6) Render additional sections
  const unicodeFonts = await maybeEmbedUnicodeFonts(pdfDoc);
  const helvetica = unicodeFonts?.regular ?? (await pdfDoc.embedFont(StandardFonts.Helvetica));
  const helveticaBold = unicodeFonts?.bold ?? (await pdfDoc.embedFont(StandardFonts.HelveticaBold));
  const fonts = { regular: helvetica, bold: helveticaBold };
  const supportsUnicode = Boolean(unicodeFonts);

  if (normalized.sections.includes("FEATURES")) {
    await renderFeaturesSection(pdfDoc, data, fonts, templateSize, supportsUnicode);
  }

  if (normalized.sections.includes("SPELLS")) {
    await renderSpellsSection(pdfDoc, data, fonts, templateSize, supportsUnicode);
  }

  // 7) Save
  return pdfDoc.save();
}
