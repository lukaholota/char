import type { Ruleset } from "@prisma/client";
import type { CreatureData } from "@/lib/bestiaryData";
import { getSpellByIdOrSlug } from "@/lib/spellsData";
import { shortenSpellName } from "@/lib/logic/spell-name";
import { buildStatblockSpellcasting } from "@/rules/creature-spellcasting";
import { buildRefId, findWildshapeCreature, findWildshapeCreatures } from "@/server/db/wildshape-creatures";

export type RoomCreatureLookup = (key: string, ruleset: Ruleset) => CreatureData | null;

/// Каталожні істоти кімнати беруться з файлу, хоумбрю (`homebrew-<id>`) — одним запитом на всю кімнату.
export async function loadRoomCreatures(rows: ReadonlyArray<{ creatureKey: string; ruleset: Ruleset }>): Promise<RoomCreatureLookup> {
  const found = await findWildshapeCreatures(rows.map((row) => ({ key: row.creatureKey, ruleset: row.ruleset })));
  return (key, ruleset) => found.get(buildRefId({ key, ruleset })) ?? null;
}

export function findRoomCreature(key: string, ruleset: Ruleset): Promise<CreatureData | null> {
  return findWildshapeCreature({ key, ruleset });
}

/// Статблок для показу: бестіарній істоті додаємо заклинання з її тексту, хоумбрю вже несе свої.
export async function findCreatureStatblock(key: string, ruleset: Ruleset): Promise<CreatureData | null> {
  const creature = await findRoomCreature(key, ruleset);
  if (!creature || creature.spellcasting) return creature;
  const spellcasting = buildStatblockSpellcasting({ ...creature, ruleset }, (spellKey) => findShortSpell(spellKey, ruleset));
  return spellcasting ? { ...creature, spellcasting } : creature;
}

function findShortSpell(key: string, ruleset: Ruleset) {
  const spell = getSpellByIdOrSlug(key, ruleset);
  return spell && { ...spell, name: shortenSpellName(spell.name) };
}
