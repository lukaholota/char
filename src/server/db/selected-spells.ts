import { prisma } from "@/lib/prisma";
import type { Ruleset } from "@/rules/types";

export function loadSelectedSpellNames(ruleset: Ruleset, spellIds: number[]) {
  return prisma.spell.findMany({
    where: { ruleset, spellId: { in: spellIds } },
    select: { spellId: true, name: true },
  });
}
