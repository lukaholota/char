import type { Ruleset } from "@prisma/client";
import type { BastionFacilityData } from "@/lib/bastion-facility";
import type { CreatureData } from "@/lib/bestiaryData";
import type { DiscussionView } from "@/lib/logic/content-discussion";
import type { HomebrewKind } from "@/lib/logic/homebrew-input";
import type { HomebrewCatalogEntry } from "@/lib/logic/homebrew-view";

// Каталоги весь час переписують адресу через history.replaceState, а Next викидає серверну дію, яка в дорозі під час такого переходу.
// Тому все, що каталог читає, їде звичайним GET.
export function fetchCreatureStatblock(key: string, ruleset: Ruleset): Promise<CreatureData | null> {
  return fetchJson("/api/bestiary/statblock", { key, ruleset });
}

export function fetchCreatureKeysMatchingText(query: string, ruleset: Ruleset): Promise<string[]> {
  return fetchJson("/api/bestiary/text-matches", { q: query, ruleset });
}

export function fetchHomebrewEntries(input: { kind: HomebrewKind; ruleset: Ruleset; sort: "TOP" | "NEW" }): Promise<HomebrewCatalogEntry[]> {
  return fetchJson("/api/homebrew", input);
}

export function fetchBastionFacility(slug: string): Promise<BastionFacilityData | null> {
  return fetchJson("/api/bastions/facility", { slug });
}

export function fetchDiscussion(target: string): Promise<DiscussionView | null> {
  return fetchJson("/api/discussion", { target });
}

async function fetchJson<T>(path: string, params: Record<string, string>): Promise<T> {
  const response = await fetch(`${path}?${new URLSearchParams(params)}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`${path} відповів ${response.status}`);
  return (await response.json()) as T;
}
