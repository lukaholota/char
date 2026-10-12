import type { Ruleset } from "@prisma/client";
import { findCreatureReadingLink } from "@/lib/creature-link";
import type { ContentReference } from "./types";

export type ReferenceCardCatalog = "class" | "race" | "feat" | "magic-item" | "background" | "invocation" | "metamagic" | "infusion" | "weapon" | "armor";
export type ReferenceCardTarget = { catalog: ReferenceCardCatalog; key: string; ruleset: Ruleset; params: URLSearchParams };

const CATALOG_BY_PATH: Readonly<Record<string, ReferenceCardCatalog>> = {
  "magic-items": "magic-item", backgrounds: "background", invocations: "invocation", metamagic: "metamagic",
  infusions: "infusion", weapons: "weapon", armor: "armor",
};

const CARD_KINDS: ReadonlySet<ContentReference["kind"]> = new Set(["class", "subclass", "race", "feat", "magic-item", "background", "invocation", "metamagic", "infusion", "weapon", "armor"]);

export function findReferenceCardTarget({ kind, href }: Pick<ContentReference, "kind" | "href">): ReferenceCardTarget | null {
  return CARD_KINDS.has(kind) ? findCardTargetInHref(href) : null;
}

export function findCardTargetInHref(href: string): ReferenceCardTarget | null {
  const match = /^(\/2024)?\/([a-z-]+)(?:\/([^/?#]+))?(?:\?([^#]*))?$/.exec(href);
  if (!match) return null;
  const [, editionPrefix, path, pathKey, query] = match;
  const ruleset: Ruleset = editionPrefix ? "RULES_2024" : "RULES_2014";
  const params = new URLSearchParams(query ?? "");
  if (params.has("reference") || params.has("feature")) return null;
  const queryKey = path === "classes" ? params.get("class") : path === "races" ? params.get("race") : path === "feats" ? params.get("feat") : null;
  if (queryKey) return { catalog: path === "classes" ? "class" : path === "races" ? "race" : "feat", key: queryKey, ruleset, params };
  const catalog = CATALOG_BY_PATH[path];
  return catalog && pathKey ? { catalog, key: decodeURIComponent(pathKey), ruleset, params } : null;
}

/** Cards and statblocks are fetched on open, so the page does not carry their text. */
export function dropFetchedReferenceText(reference: ContentReference): ContentReference {
  const options = reference.options?.map(dropFetchedReferenceText) as ContentReference["options"];
  const isFetched = !!findReferenceCardTarget(reference) || !!findCreatureReadingLink(reference.href);
  return { ...reference, ...(options ? { options } : {}), ...(isFetched ? { description: undefined, details: [] } : {}) };
}
