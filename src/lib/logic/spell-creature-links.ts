import type { Ruleset } from "@prisma/client";

export type SpellCreatureLink = { key: string; ruleset: Ruleset; text: string };

const CREATURE_LINK = /<a\b[^>]*\bhref=["'](\/2024)?\/bestiary\/([a-z0-9-]+)["'][^>]*>([\s\S]*?)<\/a>/gi;

export function findSpellCreatureLinks(description: string): SpellCreatureLink[] {
  return Array.from(description.matchAll(CREATURE_LINK), ([, editionPrefix, key, text]) => ({
    key,
    ruleset: editionPrefix ? "RULES_2024" : "RULES_2014",
    text,
  }));
}

export function replaceSpellCreatureLinks(description: string, replace: (link: SpellCreatureLink) => string): string {
  return description.replace(CREATURE_LINK, (_whole, editionPrefix: string | undefined, key: string, text: string) =>
    replace({ key, ruleset: editionPrefix ? "RULES_2024" : "RULES_2014", text })
  );
}
