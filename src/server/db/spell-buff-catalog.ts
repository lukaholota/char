import type { Ruleset } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SPELL_BUFF_KEYS, findSpellBuffSpellEngName } from "@/rules/spell-buffs";
import type { SpellBuffCatalogEntry } from "@/lib/logic/state-labels";

/// Дев'ять бафів шторки станів із назвами з бази — їдуть разом зі сторінкою листа, тож працюють
/// і без мережі.
export async function loadSpellBuffCatalog(ruleset: Ruleset): Promise<SpellBuffCatalogEntry[]> {
  const engNames = [...new Set(SPELL_BUFF_KEYS.map(findSpellBuffSpellEngName))];
  const spells = await prisma.spell.findMany({ where: { engName: { in: engNames }, ruleset }, select: { spellId: true, name: true, engName: true } });

  return SPELL_BUFF_KEYS.flatMap((key) => {
    const spell = spells.find((candidate) => candidate.engName === findSpellBuffSpellEngName(key));
    return spell ? [{ key, spellId: spell.spellId, name: spell.name }] : [];
  });
}
