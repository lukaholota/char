/**
 * KR48.3 — заклинання раси 2014 лягають рядками виду; ручний дублікат перемічається ([Р53](../../../docs/DECISIONS.md#р53)).
 * Конструктор, майстер підвищення й ремонтний прогін рахують однією функцією.
 */

import type { Prisma, PrismaClient } from "@prisma/client";

import { findEarnedRaceSpells2014 } from "@/rules/race-granted-spells-2014";
import type { GrantedSpell } from "@/rules/spell-sources";
import { raceTranslations, subraceTranslations } from "@/lib/refs/translation";
import { loadOwnedSpellRows, splitGrantsByOwnership, type SubclassSpellGrants } from "@/server/db/always-prepared-spell-grants";
import { buildSpeciesPersSpellRows } from "@/server/db/species-level-grants";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export type RaceAtLevel2014 = { persId: number; race: string; subrace: string | null; characterLevel: number };

export async function saveRaceSpellGrants2014(client: DatabaseClient, input: RaceAtLevel2014 & { learnedAtLevel: number }): Promise<SubclassSpellGrants> {
  const grants = await findRaceSpellGrants2014(client, input);
  await writeRaceSpellGrants2014(client, { persId: input.persId, grants, learnedAtLevel: input.learnedAtLevel });
  return grants;
}

export async function findRaceSpellGrants2014(client: DatabaseClient, input: RaceAtLevel2014): Promise<SubclassSpellGrants> {
  const earned = findEarnedRaceSpells2014(input);
  if (!earned.length) return { created: [], adopted: [] };

  const [spells, owned] = await Promise.all([
    client.spell.findMany({ where: { ruleset: "RULES_2014", engName: { in: earned.map((spell) => spell.engName) } }, select: { spellId: true, engName: true } }),
    loadOwnedSpellRows(client, input.persId),
  ]);
  const spellIdByName = new Map(spells.map((spell) => [spell.engName, spell.spellId]));

  const granted = earned.flatMap((spell): GrantedSpell[] => {
    const spellId = spellIdByName.get(spell.engName);
    return spellId ? [{ spellId, sourceKey: spell.sourceKey, sourceName: translateRaceSource(spell.sourceKey), ability: null }] : [];
  });
  return splitGrantsByOwnership(granted, owned);
}

export async function writeRaceSpellGrants2014(
  client: DatabaseClient,
  input: { persId: number; grants: SubclassSpellGrants; learnedAtLevel: number },
): Promise<void> {
  const { persId, grants } = input;
  if (grants.created.length) {
    await client.persSpell.createMany({ data: buildSpeciesPersSpellRows(persId, grants.created, input.learnedAtLevel), skipDuplicates: true });
  }
  for (const row of buildSpeciesPersSpellRows(persId, grants.adopted, input.learnedAtLevel)) {
    const { persId: _persId, spellId, learnedAtLevel: _learnedAtLevel, ...grantFields } = row;
    await client.persSpell.update({ where: { persId_spellId: { persId, spellId } }, data: grantFields });
  }
}

function translateRaceSource(key: string): string {
  return (subraceTranslations as Record<string, string>)[key] ?? (raceTranslations as Record<string, string>)[key] ?? key;
}
