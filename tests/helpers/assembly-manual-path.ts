import type { Classes, Feats, Subclasses } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { levelUpCharacter } from "@/lib/actions/levelup";
import { minimalLevelUpForm, type LevelUpFormData } from "./levelup-form";
import { classByName, featByName, subclassByName } from "./seed-lookup";
import { normalizeForGolden, readFullPers } from "./normalize-golden";

export type ManualLevelStep = {
  className: Classes;
  isMulticlass?: boolean;
  subclass?: Subclasses;
  abilityScoreIncrease?: { ability: string; value: number }[];
  featName?: Feats;
  classOptionNames?: string[];
  subclassOptionNames?: string[];
  classOptionSpellNames?: string[];
  replaceKnownSpell?: { drop: string; add: string };
  replaceInvocation?: { drop: string; add: string };
  cantripNames?: string[];
  knownSpellNames?: string[];
  spellbookNames?: string[];
};

export async function runManualLevelUpPath(persId: number, steps: readonly ManualLevelStep[]): Promise<void> {
  for (const [index, step] of steps.entries()) {
    const form = await buildManualLevelUpForm(persId, step);
    const result = await levelUpCharacter(persId, form);
    if (result && "error" in result) throw new Error(`Ручне підвищення №${index + 1} (${step.className}): ${result.error}`);
  }
}

async function buildManualLevelUpForm(persId: number, step: ManualLevelStep): Promise<LevelUpFormData> {
  const characterClass = await classByName(step.className);
  const subclass = step.subclass ? await subclassByName(characterClass.classId, step.subclass) : null;
  const feat = step.featName ? await featByName(step.featName) : null;
  const pers = await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { level: true, multiclasses: { select: { classId: true, classLevel: true } }, classId: true } });
  const classLevelAfter = findClassLevelBefore(pers, characterClass.classId) + 1;
  return minimalLevelUpForm({
    classId: characterClass.classId,
    levelUpPath: step.isMulticlass ? "MULTICLASS" : "EXISTING",
    ...(subclass ? { subclassId: subclass.subclassId } : {}),
    customAsi: step.abilityScoreIncrease ?? [],
    ...(feat ? { featId: feat.featId } : {}),
    classChoiceSelections: await findClassChoiceSelections(characterClass.classId, classLevelAfter, step.classOptionNames ?? []),
    subclassChoiceSelections: await findSubclassChoiceSelections(await findSubclassIdAfterStep(persId, characterClass.classId, subclass?.subclassId), classLevelAfter, step.subclassOptionNames ?? []),
    classOptionSpellIds: await findSpellIds(step.classOptionSpellNames ?? []),
    ...(await findInvocationReplacement(characterClass.classId, step.replaceInvocation)),
    classSpells: await findClassSpellSelection(step),
  });
}

function findClassLevelBefore(pers: { level: number; classId: number; multiclasses: { classId: number; classLevel: number }[] }, classId: number): number {
  const extraLevels = pers.multiclasses.reduce((sum, row) => sum + row.classLevel, 0);
  if (classId === pers.classId) return pers.level - extraLevels;
  return pers.multiclasses.find((row) => row.classId === classId)?.classLevel ?? 0;
}

async function findClassChoiceSelections(classId: number, classLevel: number, optionNames: readonly string[]): Promise<Record<string, number | number[]>> {
  if (!optionNames.length) return {};
  const rows = await prisma.classChoiceOption.findMany({
    where: { classId, levelsGranted: { has: classLevel } },
    include: { choiceOption: true },
  });
  const selections: Record<string, number[]> = {};
  for (const name of optionNames) {
    const row = rows.find((candidate) => candidate.choiceOption.optionNameEng === name);
    if (!row) throw new Error(`Немає опції класу «${name}» на рівні ${classLevel}`);
    const group = row.choiceOption.groupName;
    selections[group] = [...(selections[group] ?? []), row.choiceOptionId];
  }
  return Object.fromEntries(Object.entries(selections).map(([group, ids]) => [group, ids.length === 1 ? ids[0] : ids]));
}

async function findSubclassIdAfterStep(persId: number, classId: number, chosenSubclassId: number | undefined): Promise<number | null> {
  if (chosenSubclassId) return chosenSubclassId;
  const pers = await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { classId: true, subclassId: true, multiclasses: { select: { classId: true, subclassId: true } } } });
  return pers.classId === classId ? pers.subclassId : pers.multiclasses.find((row) => row.classId === classId)?.subclassId ?? null;
}

async function findSubclassChoiceSelections(subclassId: number | null, classLevel: number, optionNames: readonly string[]): Promise<Record<string, number | number[]>> {
  if (!optionNames.length || subclassId === null) return {};
  const rows = await prisma.subclassChoiceOption.findMany({ where: { subclassId, levelsGranted: { has: classLevel } }, include: { choiceOption: true } });
  const selections: Record<string, number[]> = {};
  for (const name of optionNames) {
    const row = rows.find((candidate) => candidate.choiceOption.optionNameEng === name);
    if (!row) throw new Error(`Немає опції підкласу «${name}» на рівні ${classLevel}`);
    const group = row.choiceOption.groupName;
    selections[group] = [...(selections[group] ?? []), row.choiceOptionId];
  }
  return Object.fromEntries(Object.entries(selections).map(([group, ids]) => [group, ids.length === 1 ? ids[0] : ids]));
}

async function findInvocationReplacement(classId: number, replacement: ManualLevelStep["replaceInvocation"]): Promise<Partial<LevelUpFormData>> {
  if (!replacement) return {};
  const feature = await prisma.classOptionalFeature.findFirstOrThrow({ where: { classId, replacesInvocation: true } });
  const options = await prisma.choiceOption.findMany({ where: { optionNameEng: { in: [replacement.drop, replacement.add] }, ruleset: "RULES_2014" } });
  const idOf = (name: string) => options.find((option) => option.optionNameEng === name)!.choiceOptionId;
  return {
    classOptionalFeatureSelections: { [feature.optionalFeatureId]: true },
    classOptionalFeatureReplacementSelections: { [feature.optionalFeatureId]: { removeChoiceOptionId: idOf(replacement.drop), addChoiceOptionId: idOf(replacement.add) } },
  };
}

async function findClassSpellSelection(step: ManualLevelStep): Promise<LevelUpFormData["classSpells"]> {
  if (!step.cantripNames && !step.knownSpellNames && !step.spellbookNames && !step.replaceKnownSpell) return undefined;
  const [dropId, addId] = step.replaceKnownSpell ? await findSpellIds([step.replaceKnownSpell.drop, step.replaceKnownSpell.add]) : [];
  return {
    cantripIds: await findSpellIds(step.cantripNames ?? []),
    preparedIds: await findSpellIds(step.knownSpellNames ?? []),
    spellbookIds: await findSpellIds(step.spellbookNames ?? []),
    ...(step.replaceKnownSpell ? { preparedSwap: { dropId, addId } } : {}),
  };
}

export async function findSpellIds(engNames: readonly string[]): Promise<number[]> {
  const rows = await prisma.spell.findMany({ where: { ruleset: "RULES_2014", engName: { in: [...engNames] } }, select: { spellId: true, engName: true } });
  return engNames.map((name) => {
    const row = rows.find((candidate) => candidate.engName === name);
    if (!row) throw new Error(`Немає заклинання 2014 «${name}»`);
    return row.spellId;
  });
}

export async function readSheetState(persId: number) {
  const pers = await readFullPers(persId);
  const spells = await prisma.persSpell.findMany({ where: { persId }, include: { spell: { select: { engName: true, level: true } } }, orderBy: { persSpellId: "asc" } });
  const multiclasses = await prisma.persMulticlass.findMany({ where: { persId }, include: { class: { select: { name: true } }, subclass: { select: { name: true } } }, orderBy: { persMulticlassId: "asc" } });
  const base = normalizeForGolden(pers);
  return {
    ...base,
    multiclasses: multiclasses.map((row) => ({ class: row.class.name, subclass: row.subclass?.name ?? null, classLevel: row.classLevel })),
    spells: spells
      .map((row) => ({ spell: row.spell.engName, level: row.spell.level, origin: row.origin, sourceName: row.sourceName, badgeText: row.badgeText, learnedAtLevel: row.learnedAtLevel, isPrepared: row.isPrepared }))
      .sort((a, b) => a.spell.localeCompare(b.spell)),
  };
}

export type SheetState = Awaited<ReturnType<typeof readSheetState>>;

export async function countSnapshots(persId: number): Promise<number> {
  return prisma.pers.count({ where: { parentPersId: persId, isSnapshot: true } });
}
