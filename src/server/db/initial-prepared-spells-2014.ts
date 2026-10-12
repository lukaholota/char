
import type { Prisma, PrismaClient } from "@prisma/client";

import { buildClassSpellFilters2014, findSpellLists2014 } from "@/rules/class-spell-choices-2014";
import { NO_SPELLS } from "@/rules/class-spell-choices-2024";
import { isListPreparedCaster2014 } from "@/rules/initial-prepared-spells-2014";
import { findSpellKnowledge2014 } from "@/rules/spell-knowledge-2014";
import { loadRuleGrantedSpellIds } from "@/server/db/class-spell-choices";
import { loadSpellChoiceOptions } from "@/server/db/spell-choice-options";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export type InitialPreparedListInput = { classId: number; subclassId: number | null; unavailableSpellIds: readonly number[] };

export async function loadInitialPreparedListSpellIds(client: DatabaseClient, input: InitialPreparedListInput): Promise<number[]> {
  const [characterClass, subclass] = await Promise.all([
    client.class.findUnique({ where: { classId: input.classId }, select: { name: true } }),
    input.subclassId ? client.subclass.findUnique({ where: { subclassId: input.subclassId }, select: { name: true } }) : null,
  ]);
  if (!characterClass || !isListPreparedCaster2014(characterClass.name)) return [];

  const caster = { className: characterClass.name, subclassName: subclass?.name ?? null };
  const maxSpellLevel = findSpellKnowledge2014(caster.className, 1, caster.subclassName)?.maxSpellLevel ?? 0;
  const filters = buildClassSpellFilters2014({ lists: findSpellLists2014(caster), quota: { ...NO_SPELLS, maxSpellLevel }, schoolLimit: null });
  const [listSpells, grantedByRules] = await Promise.all([
    loadSpellChoiceOptions(client, "RULES_2014", filters.spells),
    loadRuleGrantedSpellIds(client, { classId: input.classId, classLevel: 1, subclassId: input.subclassId }),
  ]);
  const unavailable = new Set(input.unavailableSpellIds);
  return listSpells.map((spell) => spell.spellId).filter((spellId) => !grantedByRules.has(spellId) && !unavailable.has(spellId));
}
