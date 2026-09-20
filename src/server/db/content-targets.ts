import { prisma } from "@/lib/prisma";
import { findCreatureByKey } from "@/lib/bestiaryData";
import { getAllSpells } from "@/lib/spellsData";
import { buildSpellSlug } from "@/lib/spell-link";
import type { DiscussionTarget } from "@/lib/logic/content-discussion";

export type TargetLookup = { exists: false } | { exists: true; authorUserId: number | null };

export async function findDiscussionTarget(target: DiscussionTarget): Promise<TargetLookup> {
  if (target.kind === "HOMEBREW") {
    const entry = await prisma.homebrewEntry.findFirst({ where: { homebrewEntryId: target.entryId, deletedAt: null }, select: { authorUserId: true } });
    return entry ? { exists: true, authorUserId: entry.authorUserId } : { exists: false };
  }
  return isCatalogTargetKnown(target) ? { exists: true, authorUserId: null } : { exists: false };
}

function isCatalogTargetKnown(target: Extract<DiscussionTarget, { kind: "SPELL" | "CREATURE" }>): boolean {
  if (target.kind === "CREATURE") return findCreatureByKey(target.key, target.ruleset) !== null;
  return getAllSpells(target.ruleset).some((spell) => buildSpellSlug(spell.engName) === target.key);
}
