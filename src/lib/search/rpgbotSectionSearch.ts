import { rpgbotSearchHitsSchema } from "./rpgbot-search-schema";
import type { OmniSearchItem } from "@/lib/omniSearchData";
import type { Ruleset } from "@/lib/prisma-enums";

export async function fetchRpgbotSectionMatches(query: string, ruleset: Ruleset): Promise<OmniSearchItem[]> {
  if (ruleset !== "RULES_2014") return [];
  const response = await fetch(`/api/search/rpgbot?${new URLSearchParams({ q: query, ruleset })}`);
  if (!response.ok) throw new Error(`RPGbot search failed: ${response.status}`);
  return rpgbotSearchHitsSchema.parse(await response.json());
}
