/**
 * O48 — замовляння, яке раса 2014 дає обрати (Високий ельф, Кобольд із Драконячим чаклунством,
 * Астральний ельф): пропозиція для конструктора, перевірка перед записом і рядки виду.
 * Правило — [`race-spell-choices-2014.ts`](../../rules/race-spell-choices-2014.ts).
 */

import type { Prisma, PrismaClient } from "@prisma/client";

import { buildFeatSpellFilter, findFeatSpellSelectionProblem, type FeatSpellChoiceOffer } from "@/rules/feat-spell-choices";
import { findRaceSpellChoice2014, type RaceAtCreation2014 } from "@/rules/race-spell-choices-2014";
import type { GrantedSpell } from "@/rules/spell-sources";
import { loadCandidateSpells } from "@/server/db/feat-spell-choices";
import { translateRaceSource } from "@/server/db/race-spell-grants-2014";
import { loadSpellChoiceOptions } from "@/server/db/spell-choice-options";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export type RaceSpellOffer2014 = { label: string; offer: FeatSpellChoiceOffer };

export type RaceSelectionIds = { raceId: number; subraceId: number | null; raceChoiceOptionIds: readonly number[] };

export async function loadRaceSpellOffer2014(
  client: DatabaseClient,
  input: RaceAtCreation2014 & { unavailableSpellIds: readonly number[] },
): Promise<RaceSpellOffer2014 | null> {
  const choice = findRaceSpellChoice2014(input);
  if (!choice) return null;

  const unavailable = new Set(input.unavailableSpellIds);
  const picks = await Promise.all(
    choice.rule.picks.map(async (pick) => ({
      count: pick.count,
      spellLevel: pick.spellLevel,
      spells: (await loadSpellChoiceOptions(client, "RULES_2014", buildFeatSpellFilter(pick))).filter((spell) => !unavailable.has(spell.spellId)),
    })),
  );
  return { label: choice.label, offer: { picks } };
}

export async function findRaceSpellChoiceProblem2014(
  client: DatabaseClient,
  input: RaceAtCreation2014 & { selectedSpellIds: readonly number[]; unavailableSpellIds: readonly number[] },
): Promise<{ problem: string | null; spells: GrantedSpell[] }> {
  const choice = findRaceSpellChoice2014(input);
  if (!choice) return { problem: input.selectedSpellIds.length > 0 ? "Раса не дає обрати заклинання" : null, spells: [] };

  const candidates = await loadCandidateSpells(client, "RULES_2014", choice.rule);
  const problem = findFeatSpellSelectionProblem(choice.rule, input.selectedSpellIds, candidates, choice.label);
  if (problem) return { problem, spells: [] };

  const unavailable = new Set(input.unavailableSpellIds);
  if (input.selectedSpellIds.some((spellId) => unavailable.has(spellId))) {
    return { problem: `Це заклинання у вас уже є — оберіть інше: ${choice.label}`, spells: [] };
  }

  const sourceName = translateRaceSource(choice.sourceKey);
  return { problem: null, spells: input.selectedSpellIds.map((spellId) => ({ spellId, sourceKey: choice.sourceKey, sourceName, ability: null })) };
}

export async function loadRaceAtCreation2014(client: DatabaseClient, input: RaceSelectionIds): Promise<RaceAtCreation2014 | null> {
  const [race, subrace, options] = await Promise.all([
    client.race.findUnique({ where: { raceId: input.raceId }, select: { name: true, ruleset: true } }),
    input.subraceId ? client.subrace.findUnique({ where: { subraceId: input.subraceId }, select: { name: true } }) : null,
    input.raceChoiceOptionIds.length
      ? client.raceChoiceOption.findMany({ where: { optionId: { in: [...input.raceChoiceOptionIds] } }, select: { optionName: true } })
      : [],
  ]);
  if (!race || race.ruleset !== "RULES_2014") return null;
  return { race: race.name, subrace: subrace?.name ?? null, chosenRaceOptionNames: options.map((option) => option.optionName) };
}
