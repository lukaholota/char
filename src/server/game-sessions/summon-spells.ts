import type { Ruleset } from "@/lib/prisma-enums";
import { findCreatureByKey } from "@/lib/bestiaryData";
import { shortenSpellName } from "@/lib/logic/spell-name";
import { getAllSpells } from "@/lib/spellsData";
import { listSummonSpells } from "@/rules/summon-spells";

export type SummonCreatureOption = { key: string; name: string; isChainOnly: boolean };
export type NamedSummonSpell = { engName: string; name: string; creatures: SummonCreatureOption[] };

const namedSpellsByRuleset = new Map<Ruleset, NamedSummonSpell[]>();

export function listNamedSummonSpells(ruleset: Ruleset): NamedSummonSpell[] {
  const cached = namedSpellsByRuleset.get(ruleset);
  if (cached) return cached;
  const spellNames = new Map(getAllSpells(ruleset).map((spell) => [spell.engName, shortenSpellName(spell.name)]));
  const named = listSummonSpells(ruleset)
    .map(({ engName, forms }) => ({
      engName,
      name: spellNames.get(engName) ?? engName,
      creatures: forms.map(({ key, isChainOnly }) => ({ key, isChainOnly, name: findCreatureByKey(key, ruleset)?.name ?? key })),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "uk"));
  namedSpellsByRuleset.set(ruleset, named);
  return named;
}
