/**
 * KR31.5 — кандидати й запис заклинання, яке гравець обирає в рисі 2024. Правило фільтра —
 * [`src/rules/feat-spell-choices.ts`](../../rules/feat-spell-choices.ts).
 *
 * Кандидати читаються з бази, а не з каталогу: id заклинань 2024 у каталозі й у базі різні
 * (див. `buildSpellLinkForSpell`), а рядок пишеться в базу процесу.
 */

import type { Prisma, PrismaClient } from "@prisma/client";

import { featTranslations, spellSchoolTranslations } from "@/lib/refs/translation";
import {
  findFeatSpellChoiceRule,
  findFeatSpellSelectionProblem,
  listFeatNamesWithSpellChoice,
  type FeatSpellChoiceOffer,
  type FeatSpellChoiceRule,
  type FeatSpellOption,
} from "@/rules/feat-spell-choices";
import type { GrantedSpell } from "@/rules/spell-sources";
import type { RulesetId } from "@/rules/strategies/types";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export async function loadFeatSpellChoiceOffers(
  client: DatabaseClient,
  ruleset: RulesetId,
): Promise<Record<string, FeatSpellChoiceOffer>> {
  const offers: Record<string, FeatSpellChoiceOffer> = {};

  for (const featName of listFeatNamesWithSpellChoice(ruleset)) {
    const rule = findFeatSpellChoiceRule(ruleset, featName);
    if (rule) offers[featName] = { count: rule.count, spells: await loadCandidateSpells(client, ruleset, rule) };
  }

  return offers;
}

export async function findFeatSpellChoiceProblem(
  client: DatabaseClient,
  input: { ruleset: RulesetId; featName: string; selectedSpellIds: readonly number[] },
): Promise<string | null> {
  const rule = findFeatSpellChoiceRule(input.ruleset, input.featName);
  if (!rule) return null;

  const candidates = await loadCandidateSpells(client, input.ruleset, rule);
  return findFeatSpellSelectionProblem(rule, input.selectedSpellIds, candidates);
}

/** Обране гравцем лягає тим самим джерелом-рисою, що й поіменне заклинання тієї ж риси. */
export function buildChosenFeatSpells(featName: string, selectedSpellIds: readonly number[]): GrantedSpell[] {
  const sourceName = featTranslations[featName as keyof typeof featTranslations] ?? featName;
  return selectedSpellIds.map((spellId) => ({ spellId, sourceKey: featName, sourceName, ability: null }));
}

async function loadCandidateSpells(
  client: DatabaseClient,
  ruleset: RulesetId,
  rule: FeatSpellChoiceRule,
): Promise<FeatSpellOption[]> {
  const rows = await client.spell.findMany({
    where: {
      ruleset,
      level: rule.spellLevel,
      school: { in: rule.schools.map((school) => spellSchoolTranslations[school]) },
    },
    select: { spellId: true, name: true, engName: true, level: true, school: true },
    orderBy: { name: "asc" },
  });

  return rows.map((row) => ({ ...row, school: findSchoolKey(row.school) }));
}

function findSchoolKey(ukrainianSchool: string | null): string | null {
  const entry = Object.entries(spellSchoolTranslations).find(([, name]) => name === ukrainianSchool);
  return entry?.[0] ?? null;
}
