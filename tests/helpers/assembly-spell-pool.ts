import { prisma } from "@/lib/prisma";
import { buildSpellSlug } from "@/lib/spell-link";
import { buildAssemblyCatalog } from "@/lib/optimization/assembly-catalog";
import type { SpellPoolEntry, WalkEnvironment } from "@/lib/optimization/progression-walk-types";
import type { CreatorContent } from "@/server/db/creator-content-query";
import { findSchoolKey } from "@/server/db/spell-choice-options";

const YES_FLAG = "так";

export async function loadDatabaseSpellPool(): Promise<SpellPoolEntry[]> {
  const rows = await prisma.spell.findMany({
    where: { ruleset: "RULES_2014" },
    select: { spellId: true, name: true, engName: true, level: true, school: true, hasRitual: true, spellClasses: { where: { ruleset: "RULES_2014" }, select: { className: true } } },
  });
  return rows
    .map((row): SpellPoolEntry => ({
      spellId: row.spellId, name: row.name, engName: row.engName, level: row.level, school: findSchoolKey(row.school), ruleset: "RULES_2014",
      spellLists: row.spellClasses.map((entry) => entry.className), isRitual: row.hasRitual === YES_FLAG, key: buildSpellSlug(row.engName),
    }))
    .sort((left, right) => left.level - right.level || left.engName.localeCompare(right.engName));
}

export async function applyDatabaseSpellPool(env: WalkEnvironment, content: CreatorContent): Promise<WalkEnvironment> {
  const spellPool = await loadDatabaseSpellPool();
  return { ...env, spellPool, catalog: buildAssemblyCatalog(content, spellPool) };
}
