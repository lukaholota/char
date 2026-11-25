import type { Ruleset } from "@/lib/prisma-enums";
import { parseTokenPosition, type TokenPosition } from "@/rules/game-map";

/// Ключі істот бестіарію (slug англійської назви). chainForms — лише для Пакту ланцюга.
/// «Зʼява …» (Conjure) і демонів не беремо: там гравець обирає будь-кого за небезпекою, це робить майстер.
type SummonForms = { forms: readonly string[]; chainForms?: readonly string[] };

const SPIRIT_SPELLS = {
  "Summon Aberration": { forms: ["aberrant-spirit"] },
  "Summon Beast": { forms: ["bestial-spirit"] },
  "Summon Celestial": { forms: ["celestial-spirit"] },
  "Summon Construct": { forms: ["construct-spirit"] },
  "Summon Elemental": { forms: ["elemental-spirit"] },
  "Summon Fey": { forms: ["fey-spirit"] },
  "Summon Fiend": { forms: ["fiendish-spirit"] },
  "Summon Undead": { forms: ["undead-spirit"] },
} satisfies Record<string, SummonForms>;

const SUMMON_SPELLS: Record<Ruleset, Record<string, SummonForms>> = {
  RULES_2014: {
    "Find Familiar": {
      forms: ["bat", "cat", "crab", "frog", "hawk", "lizard", "octopus", "owl", "poisonous-snake", "quipper", "rat", "raven", "sea-horse", "spider", "weasel"],
      chainForms: ["imp", "pseudodragon", "quasit", "sprite"],
    },
    "Find Steed": { forms: ["warhorse", "pony", "camel", "elk", "mastiff"] },
    "Find Greater Steed": { forms: ["griffon", "pegasus", "peryton", "dire-wolf", "rhinoceros", "saber-toothed-tiger"] },
    ...SPIRIT_SPELLS,
    "Summon Shadowspawn": { forms: ["shadow-spirit"] },
    "Summon Draconic Spirit": { forms: ["draconic-spirit"] },
  },
  RULES_2024: {
    "Find Familiar": {
      forms: ["bat", "cat", "crab", "frog", "hawk", "lizard", "octopus", "owl", "rat", "raven", "spider", "weasel"],
      chainForms: ["imp", "pseudodragon", "quasit", "skeleton", "slaad-tadpole", "sphinx-of-wonder", "sprite", "venomous-snake"],
    },
    "Find Steed": { forms: ["otherworldly-steed"] },
    ...SPIRIT_SPELLS,
    "Summon Dragon": { forms: ["draconic-spirit"] },
  },
};

export type SummonSpell = { engName: string; forms: Array<{ key: string; isChainOnly: boolean }> };

export function listSummonSpells(ruleset: Ruleset): SummonSpell[] {
  return Object.entries(SUMMON_SPELLS[ruleset]).map(([engName, { forms, chainForms = [] }]) => ({
    engName,
    forms: [...forms.map((key) => ({ key, isChainOnly: false })), ...chainForms.map((key) => ({ key, isChainOnly: true }))],
  }));
}

export const isSummonSpell = (spellEngName: string | null | undefined) => Boolean(spellEngName) && Object.values(SUMMON_SPELLS).some((spells) => Object.hasOwn(spells, spellEngName!));

export function canSummon(ruleset: Ruleset, spellEngName: string, creatureKey: string): boolean {
  const spell = Object.hasOwn(SUMMON_SPELLS[ruleset], spellEngName) ? SUMMON_SPELLS[ruleset][spellEngName] : null;
  return Boolean(spell && (spell.forms.includes(creatureKey) || spell.chainForms?.includes(creatureKey)));
}

export type SummonRequest = { spellEngName: string; creatureKey: string; position: TokenPosition };

export function parseSummonRequest(raw: unknown): SummonRequest | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { spellEngName, creatureKey, position } = raw as Record<string, unknown>;
  const parsedPosition = parseTokenPosition(position);
  if (typeof spellEngName !== "string" || typeof creatureKey !== "string" || !parsedPosition) return null;
  return { spellEngName, creatureKey, position: parsedPosition };
}
