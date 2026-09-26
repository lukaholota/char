import type { Prisma, Ruleset } from "@prisma/client";
import { type CreatureData, buildCreatureKey, findCreatureByKey } from "@/lib/bestiaryData";
import { buildMediaImageUrl } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";
import { buildHomebrewCreatureKey, findHomebrewCreatureEntryId } from "@/lib/logic/homebrew-catalog";
import { buildHomebrewCreatureData, isHomebrewCatalogId } from "@/lib/logic/homebrew-view";
import { readImageKey } from "@/server/db/homebrew-removal";

export type WildshapeCreatureRef = { key: string; ruleset: Ruleset };

/// Хоумбрю в бестіарії має ключ `homebrew-<id>`, а не слаг англ. назви: інакше хоумбрю «Wolf»
/// прикріпився б як каталожний вовк.
export function buildWildshapeCreatureKey(creature: Pick<CreatureData, "creatureId" | "nameEng">): string {
  return isHomebrewCatalogId(creature.creatureId) ? buildHomebrewCreatureKey(-creature.creatureId) : buildCreatureKey(creature);
}

export async function findWildshapeCreature(ref: WildshapeCreatureRef): Promise<CreatureData | null> {
  return (await findWildshapeCreatures([ref])).get(buildRefId(ref)) ?? null;
}

/// Один запит до бази на всі хоумбрю-форми листа, каталожні — з файлу.
export async function findWildshapeCreatures(refs: readonly WildshapeCreatureRef[]): Promise<Map<string, CreatureData>> {
  const homebrew = await loadHomebrewCreatures(refs);

  const found = new Map<string, CreatureData>();
  for (const ref of refs) {
    const creature = findHomebrewCreatureEntryId(ref.key) === null ? findCreatureByKey(ref.key, ref.ruleset) : homebrew.get(buildRefId(ref));
    if (creature) found.set(buildRefId(ref), creature);
  }
  return found;
}

export function buildRefId(ref: WildshapeCreatureRef): string {
  return `${ref.ruleset}:${ref.key}`;
}

async function loadHomebrewCreatures(refs: readonly WildshapeCreatureRef[]): Promise<Map<string, CreatureData>> {
  const wanted = refs.flatMap((ref) => {
    const entryId = findHomebrewCreatureEntryId(ref.key);
    return entryId === null ? [] : [{ ref, entryId }];
  });
  if (wanted.length === 0) return new Map();

  const rows = await prisma.homebrewCreature.findMany({
    where: { homebrewEntryId: { in: wanted.map((item) => item.entryId) }, entry: { kind: "CREATURE", deletedAt: null } },
    select: { homebrewEntryId: true, statBlock: true, entry: { select: { ruleset: true } } },
  });
  const rowsById = new Map(rows.map((row) => [row.homebrewEntryId, row]));

  const loaded = new Map<string, CreatureData>();
  for (const { ref, entryId } of wanted) {
    const row = rowsById.get(entryId);
    if (!row || (row.entry.ruleset !== null && row.entry.ruleset !== ref.ruleset)) continue;
    loaded.set(buildRefId(ref), toCreatureData(entryId, ref.ruleset, row.statBlock));
  }
  return loaded;
}

function toCreatureData(entryId: number, ruleset: Ruleset, statBlock: Prisma.JsonValue): CreatureData {
  const imageKey = readImageKey(statBlock);
  const fields = statBlock && typeof statBlock === "object" && !Array.isArray(statBlock) ? statBlock : {};
  return buildHomebrewCreatureData({ entryId, ruleset }, fields, imageKey ? buildMediaImageUrl(imageKey, "full") : null);
}
