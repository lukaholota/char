/**
 * O43 / KR43.2 — підкласи зі старих книг як рядки під класом 2024. Риси, вибори й заклинання — ті
 * самі рядки 2014, лише з рівнем після зсуву (`src/rules/legacy-subclasses-2024.ts`). Персонажів не
 * чіпає; рядки 2014 лише читає.
 */

import { Classes, Prisma, PrismaClient, Subclasses } from "@prisma/client";
import { LEGACY_SUBCLASSES_2024, LegacySubclass2024 } from "../../src/rules/legacy-subclasses-2024";
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

export type LegacySubclassOutcome = { entry: LegacySubclass2024; diff: LegacySubclassDiff };

type LoadedLegacySubclass = { entry: LegacySubclass2024; class2024Id: number; plan: LegacySubclassPlan; stored: StoredLegacySubclass | null; storedId: number | null };

export async function seedLegacySubclasses2024(prisma: PrismaClient, apply: boolean): Promise<LegacySubclassOutcome[]> {
  const outcomes: LegacySubclassOutcome[] = [];

  for (const entry of LEGACY_SUBCLASSES_2024) {
    const loaded = await loadLegacySubclass(prisma, entry);
    const diff = diffLegacySubclass(loaded.plan, loaded.stored);
    if (apply) await prisma.$transaction((tx) => writeLegacySubclass(tx, loaded, diff));
    outcomes.push({ entry, diff });
  }

  return outcomes;
}

async function loadLegacySubclass(prisma: Client, entry: LegacySubclass2024): Promise<LoadedLegacySubclass> {
  const source = await loadLegacySource(prisma, entry);
  const class2024 = await loadClass2024(prisma, entry.class2024);
  const stored = await loadStoredLegacySubclass(prisma, class2024.classId, source.subclass);

  return {
    entry,
    class2024Id: class2024.classId,
    plan: planLegacySubclass(source, entry.class2024, class2024.subclassLevel),
    stored: stored?.value ?? null,
    storedId: stored?.subclassId ?? null,
  };
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

async function writeLegacySubclass(tx: Prisma.TransactionClient, loaded: LoadedLegacySubclass, diff: LegacySubclassDiff): Promise<void> {
  const subclassId = diff.row === null && loaded.storedId !== null ? loaded.storedId : await upsertLegacyRow(tx, loaded);

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

async function upsertLegacyRow(tx: Prisma.TransactionClient, loaded: LoadedLegacySubclass): Promise<number> {
  const data = toSubclassWriteData(loaded.plan.row);
  const row = await tx.subclass.upsert({
    where: { classId_name: { classId: loaded.class2024Id, name: loaded.plan.row.name } },
    update: data,
    create: { classId: loaded.class2024Id, ...data },
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
