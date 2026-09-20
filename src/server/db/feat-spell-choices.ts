/**
 * KR31.5 — кандидати й перевірка заклинань, які гравець обирає в рисі 2024. Правило фільтра —
 * [`src/rules/feat-spell-choices.ts`](../../rules/feat-spell-choices.ts).
 *
 * Кандидати читаються з бази, а не з каталогу: id заклинань 2024 у каталозі й у базі різні
 * (див. `buildSpellLinkForSpell`), а рядок пишеться в базу процесу.
 */

import { SpellOrigin, type Prisma, type PrismaClient } from "@prisma/client";

import { featTranslations } from "@/lib/refs/translation";
import {
  buildFeatSpellFilter,
  findFeatSpellChoiceRule,
  findFeatSpellSelectionProblem,
  hasFeatSpellGrowth,
  type FeatSpellChoiceContext,
  type FeatSpellChoiceOffer,
  type FeatSpellGrowthOffer,
  type FeatSpellChoiceRule,
  type FeatSpellOption,
} from "@/rules/feat-spell-choices";
import type { GrantedSpell } from "@/rules/spell-sources";
import type { RulesetId } from "@/rules/strategies/types";
import { loadSpellChoiceOptions } from "@/server/db/spell-choice-options";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export type FeatSpellChoiceInput = {
  ruleset: RulesetId;
  featName: string;
  chosenOptionIds: readonly number[];
  context?: FeatSpellChoiceContext;
};

export type FeatSpellGrowthInput = {
  persId: number;
  ruleset: RulesetId;
  characterLevel: number;
  unavailableSpellIds: readonly number[];
};

export async function loadFeatSpellChoiceOffer(
  client: DatabaseClient,
  input: FeatSpellChoiceInput & { unavailableSpellIds: readonly number[] },
): Promise<FeatSpellChoiceOffer | null> {
  const rule = await loadFeatSpellChoiceRule(client, input);
  if (!rule) return null;

  const unavailable = new Set(input.unavailableSpellIds);
  const picks = await Promise.all(
    rule.picks.map(async (pick) => ({
      count: pick.count,
      spellLevel: pick.spellLevel,
      spells: (await loadSpellChoiceOptions(client, input.ruleset, buildFeatSpellFilter(pick))).filter((spell) => !unavailable.has(spell.spellId)),
    })),
  );
  return { picks };
}

export async function loadCreationFeatSpellOffer(
  client: DatabaseClient,
  input: { featId: number; chosenOptionIds: readonly number[] },
): Promise<FeatSpellChoiceOffer | null> {
  const feat = await client.feat.findUnique({ where: { featId: input.featId }, select: { name: true, ruleset: true } });
  if (!feat) return null;
  return loadFeatSpellChoiceOffer(client, {
    ruleset: feat.ruleset as RulesetId,
    featName: feat.name,
    chosenOptionIds: input.chosenOptionIds,
    unavailableSpellIds: [],
  });
}

export async function findFeatSpellChoiceProblem(
  client: DatabaseClient,
  input: FeatSpellChoiceInput & { selectedSpellIds: readonly number[]; unavailableSpellIds: readonly number[] },
): Promise<string | null> {
  const rule = await loadFeatSpellChoiceRule(client, input);
  if (!rule) return input.selectedSpellIds.length > 0 ? "Обране заклинання не підходить цій рисі" : null;

  const problem = findFeatSpellSelectionProblem(rule, input.selectedSpellIds, await loadCandidateSpells(client, input.ruleset, rule));
  if (problem) return problem;

  const unavailable = new Set(input.unavailableSpellIds);
  return input.selectedSpellIds.some((spellId) => unavailable.has(spellId)) ? "Це заклинання вже дає інше джерело — оберіть інше" : null;
}

/** Ritual Caster, взятий раніше, на рівні з більшим бонусом майстерності дає обрати ще заклинання. */
export async function loadFeatSpellGrowthOffer(client: DatabaseClient, input: FeatSpellGrowthInput): Promise<FeatSpellGrowthOffer | null> {
  const growth = await findFeatSpellGrowth(client, input);
  if (!growth) return null;

  const offer = await loadFeatSpellChoiceOffer(client, { ...growth, ruleset: input.ruleset, chosenOptionIds: [], unavailableSpellIds: input.unavailableSpellIds });
  return offer ? { featName: growth.featName, offer } : null;
}

export async function findFeatSpellGrowthProblem(
  client: DatabaseClient,
  input: FeatSpellGrowthInput & { selectedSpellIds: readonly number[] },
): Promise<{ problem: string | null; spells: GrantedSpell[] }> {
  const growth = await findFeatSpellGrowth(client, input);
  if (!growth) {
    return { problem: input.selectedSpellIds.length > 0 ? "Обране заклинання не підходить цій рисі" : null, spells: [] };
  }

  const problem = await findFeatSpellChoiceProblem(client, { ...growth, ...input, chosenOptionIds: [] });
  return { problem, spells: problem ? [] : buildChosenFeatSpells(growth.featName, input.selectedSpellIds) };
}

/** Обране гравцем лягає тим самим джерелом-рисою, що й поіменне заклинання тієї ж риси. */
export function buildChosenFeatSpells(featName: string, selectedSpellIds: readonly number[]): GrantedSpell[] {
  const sourceName = featTranslations[featName as keyof typeof featTranslations] ?? featName;
  return selectedSpellIds.map((spellId) => ({ spellId, sourceKey: featName, sourceName, ability: null }));
}

async function loadFeatSpellChoiceRule(client: DatabaseClient, input: FeatSpellChoiceInput): Promise<FeatSpellChoiceRule | null> {
  const options = input.chosenOptionIds.length
    ? await client.choiceOption.findMany({ where: { choiceOptionId: { in: [...input.chosenOptionIds] } }, select: { optionNameEng: true } })
    : [];
  return findFeatSpellChoiceRule(input.ruleset, input.featName, options.map((option) => option.optionNameEng), input.context);
}

async function findFeatSpellGrowth(
  client: DatabaseClient,
  input: FeatSpellGrowthInput,
): Promise<{ featName: string; context: FeatSpellChoiceContext } | null> {
  const persFeats = await client.persFeat.findMany({ where: { persId: input.persId }, select: { feat: { select: { name: true } } } });
  const featName = persFeats.map((persFeat) => persFeat.feat.name).find((name) => hasFeatSpellGrowth(input.ruleset, name));
  if (!featName) return null;

  const ownedFeatSpellCount = await client.persSpell.count({ where: { persId: input.persId, origin: SpellOrigin.FEAT, sourceName: featName } });
  const context = { characterLevel: input.characterLevel, ownedFeatSpellCount };
  return findFeatSpellChoiceRule(input.ruleset, featName, [], context) ? { featName, context } : null;
}

export async function loadCandidateSpells(client: DatabaseClient, ruleset: RulesetId, rule: FeatSpellChoiceRule): Promise<FeatSpellOption[]> {
  const perPick = await Promise.all(rule.picks.map((pick) => loadSpellChoiceOptions(client, ruleset, buildFeatSpellFilter(pick))));
  return perPick.flat();
}
