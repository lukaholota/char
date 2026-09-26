import type { Ruleset } from "@prisma/client";
import {
  findOmniSearchOutcome,
  findOtherEditionMatches,
  type OmniSearchCategory,
  type OmniSearchItem,
} from "@/lib/omniSearchData";
import { buildOmniSearchRows, type OmniSearchRow } from "@/lib/search/omniSearchRows";
import { findCatalogSearchTitle, toEdition } from "@/lib/catalogs/catalog-registry";
import type { UserSearchHit } from "@/server/db/pers-search-actions";
import type { HomebrewSearchHit } from "@/server/db/homebrew-search-actions";
import type { Edition } from "@/rules/route-helpers";

export type OmniSearchPanelRowsInput = {
  query: string;
  ruleset: Ruleset;
  activeCategory: OmniSearchCategory | "ALL";
  personalResults: UserSearchHit[];
  homebrewResults: HomebrewSearchHit[];
};

/// `otherEdition` задано, коли в поточній редакції не знайшлося нічого взагалі і рядки взято
/// з іншої — інакше та сама сутність двох редакцій дублювала б видачу.
export type OmniSearchPanelRows = {
  rows: OmniSearchRow[];
  otherEdition: Edition | null;
};

export function buildOmniSearchPanelRows(input: OmniSearchPanelRowsInput): OmniSearchPanelRows {
  const edition = toEdition(input.ruleset);
  const serverItems = [
    ...input.personalResults.map((hit) => toPersonalItem(hit, edition)),
    ...input.homebrewResults.map((hit) => toHomebrewItem(hit, edition)),
  ];
  const { items, overflow } = findOmniSearchOutcome(input.query, input.ruleset, input.activeCategory, serverItems);
  if (items.length > 0) return { rows: buildOmniSearchRows(items, overflow), otherEdition: null };

  return buildOtherEditionRows(input);
}

function buildOtherEditionRows(input: OmniSearchPanelRowsInput): OmniSearchPanelRows {
  const { edition, items } = findOtherEditionMatches(input.query, input.ruleset, input.activeCategory);
  if (items.length === 0) return { rows: [], otherEdition: null };

  return { rows: buildOmniSearchRows(items, []), otherEdition: edition };
}

function toPersonalItem(hit: UserSearchHit, edition: Edition): OmniSearchItem {
  return {
    id: `${hit.kind}-${hit.id}`,
    title: hit.title,
    category: "characters",
    categoryLabel: findCatalogSearchTitle("characters", edition),
    href: hit.href,
    badge: hit.subtitle,
  };
}

function toHomebrewItem(hit: HomebrewSearchHit, edition: Edition): OmniSearchItem {
  return {
    id: `homebrew-${hit.entryId}`,
    title: hit.title,
    subtitle: hit.subtitle,
    category: "homebrew",
    categoryLabel: findCatalogSearchTitle("homebrew", edition),
    href: hit.href,
    badge: hit.badge,
    visualKey: hit.kind,
  };
}
