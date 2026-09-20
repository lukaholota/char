"use server";

import { prisma } from "@/lib/prisma";
import { buildQueryVariants } from "@/lib/search/searchQuery";
import type { HomebrewKind, HomebrewRuleset } from "@/lib/logic/homebrew-input";

/// Хоумбрю спільноти живе в базі, а не в згенерованому JSON, тому шукається серверною дією —
/// як «Мої персонажі» (Р14), тільки без власника: каталог публічний.
export type HomebrewSearchHit = {
  entryId: number;
  kind: HomebrewKind;
  title: string;
  subtitle: string;
  badge: string;
  href: string;
};

const MIN_QUERY_LENGTH = 2;
const MAX_HITS = 8;

const KIND_LABELS: Record<HomebrewKind, string> = { SPELL: "Заклинання", CREATURE: "Істота" };

export async function searchHomebrewEntries(query: string, ruleset: HomebrewRuleset): Promise<HomebrewSearchHit[]> {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY_LENGTH) return [];

  const entries = await prisma.homebrewEntry.findMany({
    where: {
      deletedAt: null,
      OR: [{ ruleset }, { ruleset: null }],
      AND: buildNameMatchFilter(buildQueryVariants(trimmed)),
    },
    select: { homebrewEntryId: true, kind: true, name: true, author: { select: { name: true } } },
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    take: MAX_HITS,
  });

  return entries.map((entry) => toHit(entry, ruleset));
}

function toHit(
  entry: { homebrewEntryId: number; kind: string; name: string; author: { name: string | null } },
  ruleset: HomebrewRuleset,
): HomebrewSearchHit {
  const kind: HomebrewKind = entry.kind === "CREATURE" ? "CREATURE" : "SPELL";
  const editionQuery = ruleset === "RULES_2024" ? "?edition=2024" : "";

  return {
    entryId: entry.homebrewEntryId,
    kind,
    title: entry.name,
    subtitle: entry.author.name ?? "",
    badge: KIND_LABELS[kind],
    href: `/homebrew/${entry.homebrewEntryId}${editionQuery}`,
  };
}

/// Ті самі варіанти г↔х, що й у пошуку персонажів (KR13.4): люди пишуть «беголдер».
function buildNameMatchFilter(variants: string[]) {
  return {
    OR: variants.map((variant) => ({
      name: { contains: variant, mode: "insensitive" as const },
    })),
  };
}
