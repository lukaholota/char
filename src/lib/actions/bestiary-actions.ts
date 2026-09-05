"use server";

import type { Ruleset } from "@prisma/client";
import { buildFullSearchText } from "@/lib/bestiary-index";
import { type CreatureData, findCreatureByKey, getAllCreatures } from "@/lib/bestiaryData";
import { toEntitySlug } from "@/lib/slug-utils";

/// Друга фаза пошуку каталогу (KR20.9, [Р14](docs/DECISIONS.md#р14)): проза статблока лишається
/// на сервері, тож рядок пошуку бестіарію знаходить те саме, що й до виносу каталогу з бандла,
/// але 4,7 МіБ тексту в браузер не їде.
const searchTextsByRuleset = new Map<Ruleset, Array<{ key: string; text: string }>>();

function getSearchTexts(ruleset: Ruleset): Array<{ key: string; text: string }> {
  const cached = searchTextsByRuleset.get(ruleset);
  if (cached) return cached;

  const texts = getAllCreatures(ruleset).map((creature) => ({
    key: toEntitySlug(creature.nameEng),
    text: buildFullSearchText(creature),
  }));
  searchTextsByRuleset.set(ruleset, texts);
  return texts;
}

export async function loadCreatureStatblock(key: string, ruleset: Ruleset): Promise<CreatureData | null> {
  return findCreatureByKey(key, ruleset);
}

export async function findCreatureKeysMatchingText(query: string, ruleset: Ruleset): Promise<string[]> {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  return getSearchTexts(ruleset)
    .filter((entry) => entry.text.includes(needle))
    .map((entry) => entry.key);
}
