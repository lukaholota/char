/**
 * Р42 — кандидати для вибору заклинання за фільтром. Читаються з бази, а не з каталогу: id
 * заклинань 2024 у каталозі й у базі різні (див. `buildSpellLinkForSpell`), а рядок пишеться в базу процесу.
 */

import type { Prisma, PrismaClient } from "@prisma/client";

import { spellSchoolTranslations } from "@/lib/refs/translation";
import { listAllowedSpellLists, type SpellChoiceFilter, type SpellChoiceOption } from "@/rules/spell-choice-filter";
import type { RulesetId } from "@/rules/strategies/types";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

const YES_FLAG = "так";

export async function loadSpellChoiceOptions(
  client: DatabaseClient,
  ruleset: RulesetId,
  filter: SpellChoiceFilter,
  onlySpellIds?: readonly number[],
): Promise<SpellChoiceOption[]> {
  const allowedLists = listAllowedSpellLists(filter);
  const rows = await client.spell.findMany({
    where: {
      ruleset,
      ...(onlySpellIds ? { spellId: { in: [...onlySpellIds] } } : {}),
      level: { in: [...filter.levels] },
      ...(filter.schools ? { school: { in: filter.schools.map((school) => spellSchoolTranslations[school]) } } : {}),
      ...(allowedLists ? { spellClasses: { some: { className: { in: [...allowedLists] }, ruleset } } } : {}),
      ...(filter.ritualOnly ? { hasRitual: YES_FLAG } : {}),
    },
    select: {
      spellId: true,
      ruleset: true,
      name: true,
      engName: true,
      level: true,
      school: true,
      hasRitual: true,
      castingTime: true,
      hasConcentration: true,
      spellClasses: { where: { ruleset }, select: { className: true } },
    },
    orderBy: [{ level: "asc" }, { name: "asc" }],
  });

  return rows.map(({ spellClasses, hasRitual, hasConcentration, ...row }) => ({
    ...row,
    isRitual: hasRitual === YES_FLAG,
    isConcentration: hasConcentration === YES_FLAG,
    school: findSchoolKey(row.school),
    spellLists: spellClasses.map((spellClass) => spellClass.className),
  }));
}

export function findSchoolKey(ukrainianSchool: string | null): string | null {
  const entry = Object.entries(spellSchoolTranslations).find(([, name]) => name === ukrainianSchool);
  return entry?.[0] ?? null;
}
