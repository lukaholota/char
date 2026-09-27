/**
 * KR48.7 — персонаж 2014, який пройшов рівень вибору до KR48.6 (Високий ельф, клірик природи, бард знань…),
 * обирає пропущене на наступному підвищенні. Вибір обовʼязковий. Заклинання, яке гравець уже тримає сам,
 * можна обрати — воно переходить до джерела вибору ([Р53](../../../docs/DECISIONS.md#р53)); видане іншим
 * правилом — ні.
 */

import type { Prisma, PrismaClient } from "@prisma/client";

import { buildFeatSpellFilter, findFeatSpellSelectionProblem, type FeatSpellChoiceOffer, type FeatSpellChoiceRule } from "@/rules/feat-spell-choices";
import { findRaceSpellChoice2014 } from "@/rules/race-spell-choices-2014";
import { listReachedSubclassFeatureSpellChoices2014 } from "@/rules/subclass-feature-spell-choices-2014";
import { isRuleGrantedRow, loadOwnedSpellRows, type OwnedSpellRow } from "@/server/db/always-prepared-spell-grants";
import { buildClassOptionPersSpellRows } from "@/server/db/class-option-spell-choices";
import { loadCandidateSpells } from "@/server/db/feat-spell-choices";
import { translateRaceSource } from "@/server/db/race-spell-grants-2014";
import { loadSpellChoiceOptions } from "@/server/db/spell-choice-options";
import { buildSpeciesPersSpellRows } from "@/server/db/species-level-grants";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export type PendingSpellChoice = { sourceName: string; label: string; rule: FeatSpellChoiceRule; source: "SUBCLASS" | "RACE" };

export type CatchUpSpellOffer = { sourceName: string; label: string; offer: FeatSpellChoiceOffer; preselectedSpellIds: number[] };

export type CatchUpSpellSelections = Record<string, readonly number[]>;

type PersSpellRow = ReturnType<typeof buildClassOptionPersSpellRows>[number] | ReturnType<typeof buildSpeciesPersSpellRows>[number];

export async function loadCatchUpSpellOffers(client: DatabaseClient, persId: number): Promise<CatchUpSpellOffer[]> {
  const pending = await findPendingSpellChoices(client, persId);
  if (!pending.length) return [];

  const owned = await loadOwnedSpellRows(client, persId);
  return Promise.all(pending.map((choice) => buildOffer(client, choice, owned)));
}

export async function findCatchUpSpellProblem(
  client: DatabaseClient,
  input: { persId: number; selections: CatchUpSpellSelections; alsoChosenSpellIds: readonly number[] },
): Promise<{ problem: string | null; pending: PendingSpellChoice[] }> {
  const pending = await findPendingSpellChoices(client, input.persId);
  const blocked = new Set([...collectRuleGrantedIds(await loadOwnedSpellRows(client, input.persId)), ...input.alsoChosenSpellIds]);

  for (const choice of pending) {
    const selected = input.selections[choice.sourceName] ?? [];
    const problem = findFeatSpellSelectionProblem(choice.rule, selected, await loadCandidateSpells(client, "RULES_2014", choice.rule), choice.label);
    if (problem) return { problem, pending };
    if (selected.some((spellId) => blocked.has(spellId))) return { problem: `Це заклинання вже зайняте — оберіть інше: ${choice.label}`, pending };
    for (const spellId of selected) blocked.add(spellId);
  }
  return { problem: null, pending };
}

/** Перелік — той, що перевірено до підвищення: у транзакції рівень уже новий. */
export async function saveCatchUpSpells(
  client: DatabaseClient,
  input: { persId: number; pending: readonly PendingSpellChoice[]; selections: CatchUpSpellSelections; learnedAtLevel: number },
): Promise<void> {
  const rows = input.pending.flatMap((choice) => buildRows(choice, input.persId, input.selections[choice.sourceName] ?? [], input.learnedAtLevel));
  for (const row of rows) {
    const { persId, spellId, learnedAtLevel: _learnedAtLevel, ...sourceFields } = row;
    await client.persSpell.upsert({ where: { persId_spellId: { persId, spellId } }, create: row, update: sourceFields });
  }
}

async function findPendingSpellChoices(client: DatabaseClient, persId: number): Promise<PendingSpellChoice[]> {
  const pers = await client.pers.findUnique({
    where: { persId },
    select: {
      ruleset: true,
      level: true,
      race: { select: { name: true } },
      subrace: { select: { name: true } },
      raceChoiceOptions: { select: { optionName: true } },
      subclass: { select: { name: true } },
      multiclasses: { select: { classLevel: true, subclass: { select: { name: true } } } },
      persSpells: { where: { sourceName: { not: null } }, select: { sourceName: true } },
    },
  });
  if (!pers || pers.ruleset !== "RULES_2014") return [];

  const madeSources = new Set(pers.persSpells.map((row) => row.sourceName));
  const mainClassLevel = pers.level - pers.multiclasses.reduce((sum, row) => sum + row.classLevel, 0);
  const subclasses = [
    { name: pers.subclass?.name, classLevel: mainClassLevel },
    ...pers.multiclasses.map((row) => ({ name: row.subclass?.name, classLevel: row.classLevel })),
  ];

  const subclassChoices = subclasses.flatMap(({ name, classLevel }) =>
    name
      ? listReachedSubclassFeatureSpellChoices2014(name, classLevel).map((choice): PendingSpellChoice => ({
          sourceName: choice.sourceName,
          label: choice.label,
          rule: { picks: choice.picks },
          source: "SUBCLASS",
        }))
      : [],
  );
  const raceChoice = findRaceSpellChoice2014({
    race: pers.race.name,
    subrace: pers.subrace?.name ?? null,
    chosenRaceOptionNames: pers.raceChoiceOptions.map((option) => option.optionName),
  });
  const raceChoices: PendingSpellChoice[] = raceChoice ? [{ sourceName: raceChoice.sourceKey, label: raceChoice.label, rule: raceChoice.rule, source: "RACE" }] : [];

  return [...subclassChoices, ...raceChoices].filter((choice) => !madeSources.has(choice.sourceName));
}

async function buildOffer(client: DatabaseClient, choice: PendingSpellChoice, owned: readonly OwnedSpellRow[]): Promise<CatchUpSpellOffer> {
  const ruleGranted = new Set(collectRuleGrantedIds(owned));
  const ownChoices = new Set(owned.filter((row) => !isRuleGrantedRow(row)).map((row) => row.spellId));

  const picks = await Promise.all(
    choice.rule.picks.map(async (pick) => ({
      count: pick.count,
      spellLevel: pick.spellLevel,
      ...(pick.maxSpellLevel !== undefined ? { maxSpellLevel: pick.maxSpellLevel } : {}),
      spells: (await loadSpellChoiceOptions(client, "RULES_2014", buildFeatSpellFilter(pick))).filter((spell) => !ruleGranted.has(spell.spellId)),
    })),
  );
  const preselectedSpellIds = picks.flatMap((pick) => {
    const heldHere = pick.spells.filter((spell) => ownChoices.has(spell.spellId)).map((spell) => spell.spellId);
    return heldHere.length > 0 && heldHere.length <= pick.count ? heldHere : [];
  });
  return { sourceName: choice.sourceName, label: choice.label, offer: { picks }, preselectedSpellIds };
}

function buildRows(choice: PendingSpellChoice, persId: number, spellIds: readonly number[], learnedAtLevel: number): PersSpellRow[] {
  if (choice.source === "SUBCLASS") return buildClassOptionPersSpellRows({ persId, sourceName: choice.sourceName, spellIds, learnedAtLevel });
  const sourceName = translateRaceSource(choice.sourceName);
  return buildSpeciesPersSpellRows(
    persId,
    spellIds.map((spellId) => ({ spellId, sourceKey: choice.sourceName, sourceName, ability: null })),
    learnedAtLevel,
  );
}

function collectRuleGrantedIds(owned: readonly OwnedSpellRow[]): number[] {
  return owned.filter(isRuleGrantedRow).map((row) => row.spellId);
}
