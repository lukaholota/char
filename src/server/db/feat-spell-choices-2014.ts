import type { Prisma, PrismaClient } from "@prisma/client";

import { findFeatSpellRule2014, findFeatSpellSelectionProblem2014, listFeatSpellFilters2014 } from "@/rules/feat-spells-2014";
import type { FeatSpellOption } from "@/rules/feat-spell-choices";
import type { GrantedSpell } from "@/rules/spell-sources";
import { buildChosenFeatSpells } from "@/server/db/feat-spell-choices";
import { loadSpellChoiceOptions } from "@/server/db/spell-choice-options";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export type FeatSpellSelectionInput2014 = {
  featName: string;
  selectedSpellIds: readonly number[];
  unavailableSpellIds: readonly number[];
};

export async function findFeatSpellChoiceProblem2014(client: DatabaseClient, input: FeatSpellSelectionInput2014): Promise<{ problem: string | null; spells: GrantedSpell[] }> {
  const rule = findFeatSpellRule2014(input.featName);
  if (!rule) return { problem: input.selectedSpellIds.length > 0 ? "Обране заклинання не підходить цій рисі" : null, spells: [] };

  const candidates = await loadFeatSpellCandidates2014(client, input.featName);
  const problem = findFeatSpellSelectionProblem2014(rule, input.selectedSpellIds, candidates);
  if (problem) return { problem, spells: [] };

  const unavailable = new Set(input.unavailableSpellIds);
  if (input.selectedSpellIds.some((spellId) => unavailable.has(spellId))) return { problem: `Це заклинання у вас уже є — оберіть інше: ${rule.label}`, spells: [] };

  const named = await loadNamedFeatSpellIds2014(client, rule.namedSpellEngNames);
  if (named.length !== rule.namedSpellEngNames.length) return { problem: `У каталозі немає заклинань риси: ${rule.label}`, spells: [] };
  const newNamedSpellIds = named.filter((spellId) => !unavailable.has(spellId) && !input.selectedSpellIds.includes(spellId));
  return { problem: null, spells: buildChosenFeatSpells(input.featName, [...newNamedSpellIds, ...input.selectedSpellIds]) };
}

export async function loadFeatSpellCandidates2014(client: DatabaseClient, featName: string): Promise<FeatSpellOption[]> {
  const rule = findFeatSpellRule2014(featName);
  if (!rule) return [];
  const perPick = await Promise.all(listFeatSpellFilters2014(rule).map((filter) => loadSpellChoiceOptions(client, "RULES_2014", filter)));
  return [...new Map(perPick.flat().map((spell) => [spell.spellId, spell])).values()];
}

async function loadNamedFeatSpellIds2014(client: DatabaseClient, engNames: readonly string[]): Promise<number[]> {
  if (!engNames.length) return [];
  const rows = await client.spell.findMany({ where: { ruleset: "RULES_2014", engName: { in: [...engNames] } }, select: { spellId: true } });
  return rows.map((row) => row.spellId);
}
