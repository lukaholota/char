import type { Ruleset } from "@prisma/client";
import type { CreatureData } from "@/lib/bestiaryData";
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
