/**
 * KR31.18 — списки заклинань підкласів 2014, які гравець обирає сам, у базі.
 *
 * Розширені списки покровителів чорнокнижника лежать у `spell_classes` під назвою підкласу
 * («Відьмацький клинок» поруч із «Чорнокнижник»), файл-джерело — `data/2014/warlock-expanded-spell-lists.json`
 * ([Р33](../../docs/DECISIONS.md#р33)). Сід зводить базу з файлом: додає рядки, яких бракує, і прибирає ті,
 * яких у книзі немає. Так само — заклинання дунамантії Школи хронургії й Школи гравітургії
 * (`data/2014/dunamancy-spell-lists.json`); вони належать лише цим школам, тож сід ще й прибирає їх зі
 * списку чарівника. Магічну руку Містичного спритника несе `subclass_spell` — це заклинання підклас дає
 * сам («You learn the mage hand cantrip»), а не пропонує обрати. Рід Джина — вибір підкласу на 1-му рівні
 * (група «Рід джина», чотири варіанти, повʼязані з Судиною джинна, як Дракон-предок із Драконячим родоводом).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PrismaClient } from "@prisma/client";
import { classTranslations, subclassTranslations } from "../../src/lib/refs/translation";

const RULESET = "RULES_2014" as const;
const LISTS_PATH = "data/2014/warlock-expanded-spell-lists.json";
const DUNAMANCY_LISTS_PATH = "data/2014/dunamancy-spell-lists.json";

const ARCANE_TRICKSTER_GRANT = { subclass: "ARCANE_TRICKSTER", spellEng: "Mage Hand", classLevel: 3 } as const;

const GENIE_KIND_CHOICE = {
  subclass: "THE_GENIE",
  featureEng: "Genie’s Vessel",
  groupName: "Рід джина",
  levelsGranted: [1],
  options: [
    { optionNameEng: "Genie Kind: Dao", optionName: "Дао" },
    { optionNameEng: "Genie Kind: Djinni", optionName: "Джин" },
    { optionNameEng: "Genie Kind: Efreeti", optionName: "Іфрит" },
    { optionNameEng: "Genie Kind: Marid", optionName: "Марід" },
  ],
} as const;

type PatronSpellEntry = { engName: string; level: number; genieKind: string | null };
type PatronSpellList = { subclass: string; subclassEng: string; definedIn: string; spells: PatronSpellEntry[] };
type SubclassOnlySpellLists = { baseClass: string; lists: PatronSpellList[] };

export type SubclassSpellListDrift = {
  /** «Підклас|заклинання» — є у файлі, немає в базі. */
  missing: string[];
  /** «Підклас|заклинання» — є в базі під назвою підкласу, немає у файлі; «Клас|заклинання» — заклинання лише підкласу стоїть у списку класу. */
  extra: string[];
  isArcaneTricksterGranted: boolean;
  /** Варіанти роду Джина, яких бракує в базі або які не повʼязані з підкласом чи Судиною джинна. */
  genieKindMissing: string[];
};

export type SubclassSpellListsOutcome = { rowsCreated: number; rowsDeleted: number; grantsCreated: number; genieKindsCreated: number };

export async function seedSubclassSpellLists2014(prisma: PrismaClient, apply: boolean): Promise<SubclassSpellListsOutcome> {
  const plan = await planSubclassSpellLists(prisma);
  const genieKinds = await planGenieKindChoice(prisma);
  const outcome = {
    rowsCreated: plan.create.length,
    rowsDeleted: plan.deleteClassIds.length,
    grantsCreated: plan.grant ? 1 : 0,
    genieKindsCreated: genieKinds.missing.length,
  };
  if (!apply) return outcome;

  if (plan.create.length) await prisma.spellClasses.createMany({ data: plan.create });
  if (plan.deleteClassIds.length) await prisma.spellClasses.deleteMany({ where: { classId: { in: plan.deleteClassIds } } });
  if (plan.grant) await prisma.subclassSpell.create({ data: plan.grant });
  await writeGenieKindChoice(prisma, genieKinds);
  return outcome;
}

export async function findSubclassSpellListDrift(prisma: PrismaClient): Promise<SubclassSpellListDrift> {
  const plan = await planSubclassSpellLists(prisma);
  const genieKinds = await planGenieKindChoice(prisma);
  return { missing: plan.missing, extra: plan.extra, isArcaneTricksterGranted: plan.grant === null, genieKindMissing: genieKinds.missing };
}

export function readPatronSpellLists(): PatronSpellList[] {
  return (JSON.parse(readFileSync(join(process.cwd(), LISTS_PATH), "utf-8")) as { lists: PatronSpellList[] }).lists;
}

export function readDunamancySpellLists(): SubclassOnlySpellLists {
  return JSON.parse(readFileSync(join(process.cwd(), DUNAMANCY_LISTS_PATH), "utf-8")) as SubclassOnlySpellLists;
}

export function translateSubclass2014(subclass: string): string {
  const label = (subclassTranslations as Partial<Record<string, string>>)[subclass];
  if (!label) throw new Error(`Підклас «${subclass}» не має назви в translation.ts`);
  return label;
}

async function planSubclassSpellLists(prisma: PrismaClient) {
  const spellIdByEngName = await findSpellIdByEngName(prisma);
  const dunamancy = readDunamancySpellLists();
  const lists = [...readPatronSpellLists(), ...dunamancy.lists];
  const labels = lists.map((list) => translateSubclass2014(list.subclass));
  const existing = await prisma.spellClasses.findMany({ where: { ruleset: RULESET, className: { in: labels } }, select: { classId: true, className: true, spellId: true } });

  const wanted = new Map<string, { spellId: number; className: string }>();
  for (const list of lists) {
    const label = translateSubclass2014(list.subclass);
    for (const spell of list.spells) {
      const spellId = spellIdByEngName.get(spell.engName.toLowerCase());
      if (!spellId) throw new Error(`${list.subclass}: заклинання «${spell.engName}» немає серед 2014`);
      wanted.set(`${label}|${spellId}`, { spellId, className: label });
    }
  }
  const present = new Set(existing.map((row) => `${row.className}|${row.spellId}`));
  const nameById = new Map([...spellIdByEngName].map(([name, spellId]) => [spellId, name]));

  const create = [...wanted.entries()].filter(([key]) => !present.has(key)).map(([, row]) => ({ ...row, ruleset: RULESET }));
  const extraRows = [
    ...existing.filter((row) => !wanted.has(`${row.className}|${row.spellId}`)),
    ...(await findSubclassOnlyRowsOnClassList(prisma, dunamancy, spellIdByEngName)),
  ];
  return {
    create,
    deleteClassIds: extraRows.map((row) => row.classId),
    missing: create.map((row) => `${row.className}|${nameById.get(row.spellId)}`).sort(),
    extra: extraRows.map((row) => `${row.className}|${nameById.get(row.spellId)}`).sort(),
    grant: await planArcaneTricksterGrant(prisma, spellIdByEngName),
  };
}

async function findSubclassOnlyRowsOnClassList(prisma: PrismaClient, subclassOnly: SubclassOnlySpellLists, spellIdByEngName: Map<string, number>) {
  const className = classTranslations[subclassOnly.baseClass as keyof typeof classTranslations];
  if (!className) throw new Error(`Клас «${subclassOnly.baseClass}» не має назви в translation.ts`);
  const spellIds = subclassOnly.lists.flatMap((list) => list.spells.map((spell) => spellIdByEngName.get(spell.engName.toLowerCase()))).filter((id): id is number => id !== undefined);
  return prisma.spellClasses.findMany({ where: { ruleset: RULESET, className, spellId: { in: spellIds } }, select: { classId: true, className: true, spellId: true } });
}

async function planArcaneTricksterGrant(prisma: PrismaClient, spellIdByEngName: Map<string, number>) {
  const subclass = await prisma.subclass.findFirst({ where: { ruleset: RULESET, name: ARCANE_TRICKSTER_GRANT.subclass }, select: { subclassId: true } });
  const spellId = spellIdByEngName.get(ARCANE_TRICKSTER_GRANT.spellEng.toLowerCase());
  if (!subclass || !spellId) throw new Error("Містичного спритника або Магічної руки 2014 немає в базі");

  const granted = await prisma.subclassSpell.findFirst({ where: { subclassId: subclass.subclassId, spellId } });
  return granted ? null : { subclassId: subclass.subclassId, spellId, classLevel: ARCANE_TRICKSTER_GRANT.classLevel, ruleset: RULESET };
}

type GenieKindPlan = { subclassId: number; featureId: number; missing: string[] };

async function planGenieKindChoice(prisma: PrismaClient): Promise<GenieKindPlan> {
  const subclass = await prisma.subclass.findFirst({ where: { ruleset: RULESET, name: GENIE_KIND_CHOICE.subclass }, select: { subclassId: true } });
  const feature = await prisma.feature.findUnique({ where: { engName: GENIE_KIND_CHOICE.featureEng }, select: { featureId: true } });
  if (!subclass || !feature) throw new Error("Джина або Судини джинна 2014 немає в базі");

  const missing: string[] = [];
  for (const option of GENIE_KIND_CHOICE.options) {
    const existing = await prisma.choiceOption.findUnique({
      where: { optionNameEng: option.optionNameEng },
      select: { choiceOptionId: true, groupName: true, optionName: true, features: { select: { featureId: true } }, subclassChoiceOptions: { select: { subclassId: true, levelsGranted: true } } },
    });
    const isComplete =
      existing !== null &&
      existing.groupName === GENIE_KIND_CHOICE.groupName &&
      existing.optionName === option.optionName &&
      existing.features.some((link) => link.featureId === feature.featureId) &&
      existing.subclassChoiceOptions.some((link) => link.subclassId === subclass.subclassId && link.levelsGranted.join() === GENIE_KIND_CHOICE.levelsGranted.join());
    if (!isComplete) missing.push(option.optionNameEng);
  }
  return { subclassId: subclass.subclassId, featureId: feature.featureId, missing };
}

async function writeGenieKindChoice(prisma: PrismaClient, plan: GenieKindPlan): Promise<void> {
  for (const option of GENIE_KIND_CHOICE.options.filter((option) => plan.missing.includes(option.optionNameEng))) {
    const row = await prisma.choiceOption.upsert({
      where: { optionNameEng: option.optionNameEng },
      update: { groupName: GENIE_KIND_CHOICE.groupName, optionName: option.optionName },
      create: { groupName: GENIE_KIND_CHOICE.groupName, optionName: option.optionName, optionNameEng: option.optionNameEng, ruleset: RULESET },
      select: { choiceOptionId: true },
    });
    const linked = await prisma.choiceOptionFeature.findFirst({ where: { choiceOptionId: row.choiceOptionId, featureId: plan.featureId } });
    if (!linked) await prisma.choiceOptionFeature.create({ data: { choiceOptionId: row.choiceOptionId, featureId: plan.featureId, ruleset: RULESET } });
    await prisma.subclassChoiceOption.upsert({
      where: { unique_subclass_choice: { subclassId: plan.subclassId, choiceOptionId: row.choiceOptionId } },
      update: { levelsGranted: [...GENIE_KIND_CHOICE.levelsGranted] },
      create: { subclassId: plan.subclassId, choiceOptionId: row.choiceOptionId, levelsGranted: [...GENIE_KIND_CHOICE.levelsGranted], ruleset: RULESET },
    });
  }
}

async function findSpellIdByEngName(prisma: PrismaClient): Promise<Map<string, number>> {
  const rows = await prisma.spell.findMany({ where: { ruleset: RULESET }, select: { spellId: true, engName: true } });
  return new Map(rows.map((row) => [row.engName.toLowerCase(), row.spellId]));
}
