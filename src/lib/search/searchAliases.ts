/**
 * Search aliases: one entity — many names people actually type
 * (docs/o13-2024-completeness/kr13.4-search-aliases.md, «спритник» → Пройдисвіт).
 *
 * The table itself lives in src/lib/refs/search-aliases.json and is owned by content work;
 * this module only reads it defensively, because a malformed row must not take the search down.
 */

import { Ruleset } from "@prisma/client";
import aliasFile from "@/lib/refs/search-aliases.json";
import { normalizeSearchText } from "@/lib/search/searchQuery";

export type SearchAliasEdition = "2014" | "2024" | "both";

export type SearchAliasEntry = {
  canonical: string;
  entityType: string;
  slug: string;
  edition: SearchAliasEdition;
  variants: string[];
};

const aliasesByKey = buildAliasLookup();

export function findAliasVariants(
  ruleset: Ruleset,
  entityTypes: string[],
  keys: Array<string | null | undefined>
): string[] {
  if (aliasesByKey.size === 0) return [];

  const variants = new Set<string>();
  for (const entityType of entityTypes) {
    for (const key of keys) {
      if (!key) continue;
      const entries = aliasesByKey.get(buildLookupKey(entityType, key)) ?? [];
      for (const entry of entries) {
        if (!coversRuleset(entry.edition, ruleset)) continue;
        for (const variant of entry.variants) variants.add(variant);
      }
    }
  }

  return [...variants];
}

export function findAliasEntry(entityType: string, key: string): SearchAliasEntry | undefined {
  return aliasesByKey.get(buildLookupKey(entityType, key))?.[0];
}

export function countAliasEntries(): number {
  return new Set([...aliasesByKey.values()].flat()).size;
}

function buildAliasLookup(): Map<string, SearchAliasEntry[]> {
  const lookup = new Map<string, SearchAliasEntry[]>();
  const file = aliasFile as unknown;
  const rows = Array.isArray(file) ? file : (file as { aliases?: unknown }).aliases;
  if (!Array.isArray(rows)) return lookup;

  for (const row of rows) {
    const entry = readAliasEntry(row);
    if (!entry) continue;

    for (const key of [entry.slug, entry.canonical]) {
      const lookupKey = buildLookupKey(entry.entityType, key);
      const bucket = lookup.get(lookupKey);
      if (bucket) bucket.push(entry);
      else lookup.set(lookupKey, [entry]);
    }
  }

  return lookup;
}

function readAliasEntry(row: unknown): SearchAliasEntry | null {
  if (typeof row !== "object" || row === null) return null;
  const candidate = row as Record<string, unknown>;

  const canonical = typeof candidate.canonical === "string" ? candidate.canonical : "";
  const entityType = typeof candidate.entityType === "string" ? candidate.entityType : "";
  const slug = typeof candidate.slug === "string" ? candidate.slug : "";
  const variants = Array.isArray(candidate.variants)
    ? candidate.variants.filter((variant): variant is string => typeof variant === "string")
    : [];

  if (!canonical || !entityType || variants.length === 0) return null;

  return { canonical, entityType, slug: slug || canonical, edition: readEdition(candidate.edition), variants };
}

function readEdition(value: unknown): SearchAliasEdition {
  return value === "2014" || value === "2024" ? value : "both";
}

function coversRuleset(edition: SearchAliasEdition, ruleset: Ruleset): boolean {
  if (edition === "both") return true;
  return (edition === "2024") === (ruleset === "RULES_2024");
}

function buildLookupKey(entityType: string, key: string): string {
  return `${normalizeSearchText(entityType)}:${normalizeSearchText(key)}`;
}
