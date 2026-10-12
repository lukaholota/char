import "server-only";

import sectionArticles from "@/lib/generated/optimization-section-search-2014.json";
import { collectArticleSearchItems } from "@/lib/search/rpgbotSearchData";
import { buildQueryMatcher, buildSearchableText, matchesQuery } from "@/lib/search/searchQuery";
import type { OmniSearchItem } from "@/lib/omniSearchData";
import type { Ruleset } from "@/lib/prisma-enums";
import { rpgbotSearchRequestSchema } from "@/lib/search/rpgbot-search-schema";

// The search panel shows at most 50 results; short queries like «ма» used to return ~3 000 sections (1.5 MB).
const SECTION_HIT_LIMIT = 50;

const entries = sectionArticles.flatMap((article) => {
  const [, ...sections] = collectArticleSearchItems(article);
  return sections.map((section, index) => ({ section,
    names: buildSearchableText([section.title, section.subtitle, ...(section.keywords ?? [])]),
    body: buildSearchableText([section.title, section.subtitle, ...(section.keywords ?? []), article.sections[index].text]) }));
});

export async function searchRpgbotSections(query: string, ruleset: Ruleset): Promise<OmniSearchItem[]> {
  const request = rpgbotSearchRequestSchema.parse({ query, ruleset });
  if (request.ruleset !== "RULES_2014" || request.query.trim().length < 2) return [];
  const matcher = buildQueryMatcher(request.query);
  if (!matcher) return [];
  return entries.filter((entry) => matchesQuery(matcher, entry.body) && !matchesQuery(matcher, entry.names))
    .slice(0, SECTION_HIT_LIMIT)
    .map((entry) => entry.section);
}
