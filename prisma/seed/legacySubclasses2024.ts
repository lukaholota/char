/**
 * O43 / KR43.2 — підкласи зі старих книг як рядки під класом 2024. Риси, вибори й заклинання — ті
 * самі рядки 2014, лише з рівнем після зсуву (`src/rules/legacy-subclasses-2024.ts`). Виняток —
 * риса розширеного списку (KR43.5): у легасі-рядка своя, зі списком заклинань 2024, текст якої сід
 * будує з файлів. Персонажів не чіпає; рядки 2014 лише читає.
 */

import { Classes, Prisma, PrismaClient, Subclasses } from "@prisma/client";
import { LEGACY_SUBCLASSES_2024, LegacySubclass2024 } from "../../src/rules/legacy-subclasses-2024";
import { buildLegacyExpandedSpellsFeature, type LegacyExpandedSpellsFeature } from "./helpers/legacyExpandedSpellsFeature";
import {
  LegacySubclassColumns,
  LegacyFeatureLink,
  LegacySubclassDiff,
  LegacySubclassPlan,
  LegacySubclassRow,
  LegacySubclassSource,
  StoredLegacySubclass,
  diffLegacySubclass,
  planLegacySubclass,
} from "./helpers/legacySubclassPlan";

type Client = PrismaClient | Prisma.TransactionClient;

export type FeatureChange = "create" | "update" | null;

export type LegacySubclassOutcome = { entry: LegacySubclass2024; diff: LegacySubclassDiff; expandedSpellsFeature: FeatureChange };

type LoadedLegacySubclass = {
  entry: LegacySubclass2024;
  class2024Id: number;
  subclassLevel2024: number;
  source: LegacySubclassSource;
  expandedSpellsFeature: LegacyExpandedSpellsFeature;
  storedFeature: StoredExpandedSpellsFeature | null;
  stored: StoredLegacySubclass | null;
  storedId: number | null;
};

type StoredExpandedSpellsFeature = { featureId: number } & Omit<LegacyExpandedSpellsFeature, "engName"> & { displayType: string[]; ruleset: string };

const PENDING_FEATURE_ID = 0;

export async function seedLegacySubclasses2024(prisma: PrismaClient, apply: boolean): Promise<LegacySubclassOutcome[]> {
  const spellNames2024 = await loadSpellNames2024(prisma);
  const outcomes: LegacySubclassOutcome[] = [];

  for (const entry of LEGACY_SUBCLASSES_2024) {
    const loaded = await loadLegacySubclass(prisma, entry, spellNames2024);
    const expandedSpellsFeature = findFeatureChange(loaded.expandedSpellsFeature, loaded.storedFeature);
    const diff = apply
      ? await prisma.$transaction((tx) => writeLegacySubclassWithFeature(tx, loaded))
      : diffLegacySubclass(planWithFeature(loaded, loaded.storedFeature?.featureId ?? PENDING_FEATURE_ID), loaded.stored);
    outcomes.push({ entry, diff, expandedSpellsFeature });
  }

  return outcomes;
}

async function loadLegacySubclass(prisma: Client, entry: LegacySubclass2024, spellNames2024: ReadonlyMap<string, string>): Promise<LoadedLegacySubclass> {
  const source = await loadLegacySource(prisma, entry);
  const class2024 = await loadClass2024(prisma, entry.class2024);
  const stored = await loadStoredLegacySubclass(prisma, class2024.classId, source.subclass);
  const expandedSpellsFeature = buildLegacyExpandedSpellsFeature(entry, spellNames2024);

  return {
    entry,
    class2024Id: class2024.classId,
    subclassLevel2024: class2024.subclassLevel,
    source,
    expandedSpellsFeature,
    storedFeature: await loadStoredExpandedSpellsFeature(prisma, expandedSpellsFeature.engName),
    stored: stored?.value ?? null,
    storedId: stored?.subclassId ?? null,
  };
}

function planWithFeature(loaded: LoadedLegacySubclass, featureId: number): LegacySubclassPlan {
  return planLegacySubclass(loaded.source, loaded.entry.class2024, loaded.subclassLevel2024, {
    replaces: loaded.entry.expandedSpellsFeature2014,
    featureId,
    engName: loaded.expandedSpellsFeature.engName,
  });
}

async function writeLegacySubclassWithFeature(tx: Prisma.TransactionClient, loaded: LoadedLegacySubclass): Promise<LegacySubclassDiff> {
  const featureId = await upsertExpandedSpellsFeature(tx, loaded.expandedSpellsFeature);
  const plan = planWithFeature(loaded, featureId);
  const diff = diffLegacySubclass(plan, loaded.stored);
  await writeLegacySubclass(tx, loaded, plan, diff);
  return diff;
}

async function loadSpellNames2024(prisma: Client): Promise<Map<string, string>> {
  const rows = await prisma.spell.findMany({ where: { ruleset: "RULES_2024" }, select: { engName: true, name: true } });
  return new Map(rows.map((row) => [row.engName, row.name]));
}

async function loadStoredExpandedSpellsFeature(prisma: Client, engName: string): Promise<StoredExpandedSpellsFeature | null> {
  const row = await prisma.feature.findUnique({
    where: { engName },
    select: { featureId: true, name: true, shortDescription: true, description: true, displayType: true, ruleset: true },
  });
  return row ? { ...row, shortDescription: row.shortDescription ?? "" } : null;
}

function findFeatureChange(planned: LegacyExpandedSpellsFeature, stored: StoredExpandedSpellsFeature | null): FeatureChange {
  if (!stored) return "create";
  const isSame =
    stored.name === planned.name &&
    stored.shortDescription === planned.shortDescription &&
    stored.description === planned.description &&
    stored.displayType.join() === "PASSIVE" &&
    stored.ruleset === "RULES_2024";
  return isSame ? null : "update";
}

async function upsertExpandedSpellsFeature(tx: Prisma.TransactionClient, feature: LegacyExpandedSpellsFeature): Promise<number> {
  const data = { name: feature.name, shortDescription: feature.shortDescription, description: feature.description, displayType: ["PASSIVE" as const], ruleset: "RULES_2024" as const };
  const row = await tx.feature.upsert({ where: { engName: feature.engName }, update: data, create: { engName: feature.engName, ...data }, select: { featureId: true } });
  return row.featureId;
}

const LEGACY_COLUMNS = {
  description: true,
  languages: true,
  languagesToChooseCount: true,
  toolProficiencies: true,
  toolToChooseCount: true,
  armorProficiencies: true,
  weaponProficiencies: true,
} as const;

const LINK_SELECT = {
  features: { select: { featureId: true, levelGranted: true, grantsSpellSlots: true, feature: { select: { engName: true } } } },
  subclassChoiceOptions: { select: { choiceOptionId: true, levelsGranted: true } },
  preparedSpells: { select: { spellId: true, classLevel: true } },
} as const;

async function loadLegacySource(prisma: Client, entry: LegacySubclass2024): Promise<LegacySubclassSource> {
  const rows = await prisma.subclass.findMany({
    where: { name: toSubclassesValue(entry.subclass), ruleset: "RULES_2014", class: { name: toClassesValue(entry.class2014) } },
    select: { name: true, ...LEGACY_COLUMNS, ...LINK_SELECT },
  });
  if (rows.length !== 1) throw new Error(`${entry.class2014}/${entry.subclass}: у базі ${rows.length} рядків підкласу 2014, очікувався один`);

  const [row] = rows;
  return {
    subclass: row.name,
    ...pickLegacyColumns(row),
    features: row.features.map(toFeatureLink),
    choiceOptions: row.subclassChoiceOptions,
    spells: row.preparedSpells,
  };
}

async function loadClass2024(prisma: Client, class2024: string) {
  const rows = await prisma.class.findMany({
    where: { name: toClassesValue(class2024), ruleset: "RULES_2024" },
    select: { classId: true, subclassLevel: true },
  });
  if (rows.length !== 1) throw new Error(`${class2024}: у базі ${rows.length} рядків класу 2024, очікувався один`);
  return rows[0];
}

async function loadStoredLegacySubclass(prisma: Client, classId: number, name: Subclasses) {
  const row = await prisma.subclass.findUnique({
    where: { classId_name: { classId, name } },
    select: { subclassId: true, name: true, ruleset: true, spellcastingType: true, grantsSpells: true, primaryCastingStat: true, ...LEGACY_COLUMNS, ...LINK_SELECT },
  });
  if (!row) return null;

  const value: StoredLegacySubclass = {
    row: {
      name: row.name,
      ruleset: row.ruleset,
      spellcastingType: row.spellcastingType,
      grantsSpells: row.grantsSpells,
      primaryCastingStat: row.primaryCastingStat,
      ...pickLegacyColumns(row),
    },
    features: row.features.map(toFeatureLink),
    choiceOptions: row.subclassChoiceOptions,
    spells: row.preparedSpells,
  };
  return { subclassId: row.subclassId, value };
}

function toFeatureLink(link: { featureId: number; levelGranted: number; grantsSpellSlots: boolean; feature: { engName: string } }): LegacyFeatureLink {
  return { featureId: link.featureId, engName: link.feature.engName, levelGranted: link.levelGranted, grantsSpellSlots: link.grantsSpellSlots };
}

function pickLegacyColumns(row: LegacySubclassColumns): LegacySubclassColumns {
  return {
    description: row.description,
    languages: row.languages,
    languagesToChooseCount: row.languagesToChooseCount,
    toolProficiencies: row.toolProficiencies,
    toolToChooseCount: row.toolToChooseCount,
    armorProficiencies: row.armorProficiencies,
    weaponProficiencies: row.weaponProficiencies,
  };
}

function toSubclassesValue(value: string): Subclasses {
  const found = Object.values(Subclasses).find((name) => name === value);
  if (!found) throw new Error(`${value}: такого значення enum Subclasses немає`);
  return found;
}

function toClassesValue(value: string): Classes {
  const found = Object.values(Classes).find((name) => name === value);
  if (!found) throw new Error(`${value}: такого значення enum Classes немає`);
  return found;
}

async function writeLegacySubclass(tx: Prisma.TransactionClient, loaded: LoadedLegacySubclass, plan: LegacySubclassPlan, diff: LegacySubclassDiff): Promise<void> {
  const subclassId = diff.row === null && loaded.storedId !== null ? loaded.storedId : await upsertLegacyRow(tx, loaded.class2024Id, plan.row);

  for (const link of diff.features.upsert) {
    await tx.subclassFeature.upsert({
      where: { subclassId_featureId: { subclassId, featureId: link.featureId } },
      update: { levelGranted: link.levelGranted, grantsSpellSlots: link.grantsSpellSlots, ruleset: "RULES_2024" },
      create: { subclassId, featureId: link.featureId, levelGranted: link.levelGranted, grantsSpellSlots: link.grantsSpellSlots, ruleset: "RULES_2024" },
    });
  }
  for (const link of diff.choiceOptions.upsert) {
    await tx.subclassChoiceOption.upsert({
      where: { unique_subclass_choice: { subclassId, choiceOptionId: link.choiceOptionId } },
      update: { levelsGranted: link.levelsGranted, ruleset: "RULES_2024" },
      create: { subclassId, ...link, ruleset: "RULES_2024" },
    });
  }
  for (const link of diff.spells.upsert) {
    await tx.subclassSpell.upsert({
      where: { unique_subclass_spell: { subclassId, spellId: link.spellId } },
      update: { classLevel: link.classLevel, ruleset: "RULES_2024" },
      create: { subclassId, ...link, ruleset: "RULES_2024" },
    });
  }

  await removeStaleLinks(tx, subclassId, diff);
}

async function upsertLegacyRow(tx: Prisma.TransactionClient, classId: number, planned: LegacySubclassRow): Promise<number> {
  const data = toSubclassWriteData(planned);
  const row = await tx.subclass.upsert({
    where: { classId_name: { classId, name: planned.name } },
    update: data,
    create: { classId, ...data },
    select: { subclassId: true },
  });
  return row.subclassId;
}

function toSubclassWriteData(row: LegacySubclassRow) {
  return { ...row, weaponProficiencies: row.weaponProficiencies ?? Prisma.DbNull };
}

async function removeStaleLinks(tx: Prisma.TransactionClient, subclassId: number, diff: LegacySubclassDiff): Promise<void> {
  if (diff.features.remove.length) {
    await tx.subclassFeature.deleteMany({ where: { subclassId, featureId: { in: diff.features.remove.map((link) => link.featureId) } } });
  }
  if (diff.choiceOptions.remove.length) {
    await tx.subclassChoiceOption.deleteMany({ where: { subclassId, choiceOptionId: { in: diff.choiceOptions.remove.map((link) => link.choiceOptionId) } } });
  }
  if (diff.spells.remove.length) {
    await tx.subclassSpell.deleteMany({ where: { subclassId, spellId: { in: diff.spells.remove.map((link) => link.spellId) } } });
  }
}
