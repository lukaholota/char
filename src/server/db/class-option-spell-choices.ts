/**
 * Заклинання, які дає обрати клас: Книга тіней Pact of the Tome 2024 і Магічні відкриття Колегії
 * знань — кандидати, перевірка й рядки заклинань. Правило —
 * [`class-option-spell-choices-2024.ts`](../../rules/class-option-spell-choices-2024.ts).
 * «They must be spells you don't already have prepared» — тому недоступні все, що персонаж уже має.
 */

import { SpellOrigin, type Prisma, type PrismaClient } from "@prisma/client";

import {
  findClassOptionSpellChoice,
  findClassOptionSpellLabel,
  findSubclassFeatureSpellChoice,
  type ClassOptionSpellChoice,
} from "@/rules/class-option-spell-choices-2024";
import { buildFeatSpellFilter, findFeatSpellSelectionProblem, type FeatSpellChoiceOffer } from "@/rules/feat-spell-choices";
import { loadCandidateSpells } from "@/server/db/feat-spell-choices";
import { loadSpellChoiceOptions } from "@/server/db/spell-choice-options";
import type { RulesetId } from "@/rules/strategies/types";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export type ClassOptionSpellOffer = { sourceName: string; label: string; offer: FeatSpellChoiceOffer };

export type SubclassAtLevel = { subclassId: number; classLevel: number };

export type ClassOptionSpellInput = {
  /** Опції, обрані на цьому кроці: у конструкторі — усі, на підвищенні — лише нові. */
  newlyChosenOptionIds: readonly number[];
  /** Підклас і рівень класу після цього кроку — для рис підкласу, що дають вибір на своєму рівні. */
  subclassAtLevel?: SubclassAtLevel | null;
  unavailableSpellIds: readonly number[];
};

const CLASS_OPTION_SPELL_BADGE_COLOR = "#c084fc";

export async function loadClassOptionSpellOffer(client: DatabaseClient, input: ClassOptionSpellInput): Promise<ClassOptionSpellOffer | null> {
  const choice = await findChoice(client, input);
  if (!choice) return null;

  const unavailable = new Set(input.unavailableSpellIds);
  const picks = await Promise.all(
    choice.rule.picks.map(async (pick) => ({
      count: pick.count,
      spellLevel: pick.spellLevel,
      ...(pick.maxSpellLevel !== undefined ? { maxSpellLevel: pick.maxSpellLevel } : {}),
      spells: (await loadSpellChoiceOptions(client, "RULES_2024", buildFeatSpellFilter(pick))).filter((spell) => !unavailable.has(spell.spellId)),
    })),
  );
  return { sourceName: choice.sourceName, label: choice.label, offer: { picks } };
}

export async function findClassOptionSpellProblem(
  client: DatabaseClient,
  input: ClassOptionSpellInput & { selectedSpellIds: readonly number[] },
): Promise<{ problem: string | null; sourceName: string | null }> {
  const choice = await findChoice(client, input);
  if (!choice) return { problem: input.selectedSpellIds.length > 0 ? "Жодна обрана опція класу не дає обрати заклинання" : null, sourceName: null };

  const candidates = await loadCandidateSpells(client, "RULES_2024", choice.rule);
  const problem = findFeatSpellSelectionProblem(choice.rule, input.selectedSpellIds, candidates, choice.label);
  if (problem) return { problem, sourceName: choice.sourceName };

  const unavailable = new Set(input.unavailableSpellIds);
  const hasOwned = input.selectedSpellIds.some((spellId) => unavailable.has(spellId));
  return { problem: hasOwned ? `Це заклинання у вас уже є — оберіть інше: ${choice.label}` : null, sourceName: choice.sourceName };
}

/** «Функціонують як заклинання класу» й завжди підготовлені — поза лімітом підготовки. */
export function buildClassOptionPersSpellRows(input: { persId: number; sourceName: string; spellIds: readonly number[]; learnedAtLevel: number }) {
  return input.spellIds.map((spellId) => ({
    persId: input.persId,
    spellId,
    learnedAtLevel: input.learnedAtLevel,
    origin: SpellOrigin.CLASS,
    sourceName: input.sourceName,
    isPrepared: true,
    badgeText: findClassOptionSpellLabel(input.sourceName) ?? input.sourceName.slice(0, 24),
    badgeColor: CLASS_OPTION_SPELL_BADGE_COLOR,
    excludeFromPreparedCount: true,
    excludeFromKnownCount: true,
  }));
}

/** Підклас обраного класу після цього підвищення: щойно обраний або вже записаний, і рівень класу, який він отримує. */
export async function findSubclassAtNextLevel(
  client: DatabaseClient,
  input: { persId: number; classId: number; subclassId: number | null },
): Promise<SubclassAtLevel | null> {
  const pers = await client.pers.findUnique({
    where: { persId: input.persId },
    select: { level: true, classId: true, subclassId: true, multiclasses: { select: { classId: true, classLevel: true, subclassId: true } } },
  });
  if (!pers) return null;

  const multiclass = pers.multiclasses.find((row) => row.classId === input.classId);
  const mainClassLevel = pers.level - pers.multiclasses.reduce((sum, row) => sum + row.classLevel, 0);
  const classLevelBefore = input.classId === pers.classId ? mainClassLevel : multiclass?.classLevel ?? 0;
  const existingSubclassId = input.classId === pers.classId ? pers.subclassId : multiclass?.subclassId ?? null;
  const subclassId = input.subclassId ?? existingSubclassId;
  return subclassId ? { subclassId, classLevel: classLevelBefore + 1 } : null;
}

async function findChoice(client: DatabaseClient, input: ClassOptionSpellInput): Promise<ClassOptionSpellChoice | null> {
  return (await findChoiceForOptions(client, input.newlyChosenOptionIds)) ?? (await findChoiceForSubclass(client, input.subclassAtLevel ?? null));
}

async function findChoiceForOptions(client: DatabaseClient, optionIds: readonly number[]) {
  if (!optionIds.length) return null;
  const options = await client.choiceOption.findMany({ where: { choiceOptionId: { in: [...optionIds] } }, select: { optionNameEng: true } });
  return findClassOptionSpellChoice(options.map((option) => option.optionNameEng));
}

async function findChoiceForSubclass(client: DatabaseClient, subclassAtLevel: SubclassAtLevel | null) {
  if (!subclassAtLevel) return null;
  const subclass = await client.subclass.findUnique({ where: { subclassId: subclassAtLevel.subclassId }, select: { name: true, ruleset: true } });
  if (!subclass) return null;
  return findSubclassFeatureSpellChoice({ ruleset: subclass.ruleset as RulesetId, subclassName: subclass.name, classLevel: subclassAtLevel.classLevel });
}
