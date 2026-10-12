import descriptions2014 from "@/lib/generated/optimization-feature-descriptions-2014.json";
import { findPlainEnglishName } from "@/lib/catalogs/reading-target";
import { toEntitySlug } from "@/lib/slug-utils";
import { normalizeContentName, type HydrationTarget } from "./content-hydration";
import type { ContentReference, OptimizationRuleset } from "./types";

export function collectSupplementalReferences(ruleset: OptimizationRuleset, targets: readonly HydrationTarget[]): ContentReference[] {
  if (ruleset !== "RULES_2014") return [];
  const knownNames = new Set(targets
    .filter((target) => target.kind !== "creature" && (target.priority ?? 0) >= 0)
    .map((target) => normalizeContentName(findPlainEnglishName(target.engName))));
  return descriptions2014.filter((entry) => !knownNames.has(normalizeContentName(entry.engName)))
    .map((entry) => ({ name: entry.name, engName: entry.engName, description: entry.description,
      kind: "kind" in entry && (entry.kind === "feat" || entry.kind === "magic-item" || entry.kind === "equipment") ? entry.kind : "feature", href: `/${entry.catalog}?reference=${toEntitySlug(entry.engName)}`,
      details: entry.details ?? [] }));
}
