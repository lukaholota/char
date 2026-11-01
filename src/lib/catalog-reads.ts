import type { Ruleset } from "@prisma/client";
import type { BastionFacilityData } from "@/lib/bastion-facility";
import type { CreatureData } from "@/lib/bestiaryData";
import type { CreatureLoreGroup } from "@/lib/bestiaryLore";
import type { DiscussionView } from "@/lib/logic/content-discussion";
import type { HomebrewKind } from "@/lib/logic/homebrew-input";
import type { HomebrewCatalogEntry } from "@/lib/logic/homebrew-view";
import type { ReferenceCard } from "@/lib/optimization/reference-cards.server";

export type CreatureStatblockView = {
  creature: CreatureData | null;
  loreGroup: CreatureLoreGroup | null;
};

// Каталоги весь час переписують адресу через history.replaceState, а Next викидає серверну дію, яка в дорозі під час такого переходу.
// Тому все, що каталог читає, їде звичайним GET.
export function fetchCreatureStatblock(key: string, ruleset: Ruleset): Promise<CreatureStatblockView> {
  return fetchJson("/api/bestiary/statblock", { key, ruleset });
}

export function fetchCreatureKeysMatchingText(query: string, ruleset: Ruleset): Promise<string[]> {
  return fetchJson("/api/bestiary/text-matches", { q: query, ruleset });
}

export function fetchHomebrewEntries({ noAi, ...input }: { kind: HomebrewKind; ruleset: Ruleset; sort: "TOP" | "NEW"; noAi: boolean }): Promise<HomebrewCatalogEntry[]> {
  return fetchJson("/api/homebrew", { ...input, ...buildNoAiParam(noAi) });
}

export function fetchBastionFacility(slug: string): Promise<BastionFacilityData | null> {
  return fetchJson("/api/bastions/facility", { slug });
}

export function fetchReferenceCard(href: string): Promise<ReferenceCard> {
  return fetchJson("/api/reference-card", { href });
}

export function fetchDiscussion(target: string, noAi: boolean): Promise<DiscussionView | null> {
  return fetchJson("/api/discussion", { target, ...buildNoAiParam(noAi) });
}

function buildNoAiParam(noAi: boolean): Record<string, string> {
  return noAi ? { noAi: "1" } : {};
}

async function fetchJson<T>(path: string, params: Record<string, string>): Promise<T> {
  const response = await fetch(`${path}?${new URLSearchParams(params)}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`${path} відповів ${response.status}`);
  return (await response.json()) as T;
}
