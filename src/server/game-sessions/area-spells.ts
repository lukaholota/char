import type { Ruleset } from "@/lib/prisma-enums";
import { shortenSpellName } from "@/lib/logic/spell-name";
import { getAllSpells } from "@/lib/spellsData";
import type { AreaShape } from "@/rules/game-areas";
import { findSpellArea } from "@/rules/spell-area";

export type AreaSpell = { engName: string; name: string; shape: AreaShape; sizeFeet: number };

const areaSpellsByRuleset = new Map<Ruleset, AreaSpell[]>();

function buildAreaSpells(ruleset: Ruleset): AreaSpell[] {
  const areaSpells: AreaSpell[] = [];
  for (const spell of getAllSpells(ruleset)) {
    const area = findSpellArea(spell);
    if (area) areaSpells.push({ engName: spell.engName, name: shortenSpellName(spell.name), ...area });
  }
  return areaSpells.sort((a, b) => a.name.localeCompare(b.name, "uk"));
}

export function listAreaSpells(ruleset: Ruleset): AreaSpell[] {
  const cached = areaSpellsByRuleset.get(ruleset);
  if (cached) return cached;
  const areaSpells = buildAreaSpells(ruleset);
  areaSpellsByRuleset.set(ruleset, areaSpells);
  return areaSpells;
}
