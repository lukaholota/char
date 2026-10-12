import type { HydrationTarget } from "./content-hydration";
import type { AnalysisArticle } from "./types";

const SUMMONED_SPIRIT_FORMS = [
  { spirit: "Aberrant Spirit", sectionId: "section-summon-aberration", forms: ["Beholderkin", "Slaad", "Star Spawn", "StarSpawn"] },
  { spirit: "Elemental Spirit", sectionId: "section-summon-elemental", forms: ["Air", "Earth", "Fire", "Water"] },
  { spirit: "Fiendish Spirit", sectionId: "section-summon-fiend", forms: ["Demon", "Devil", "Yugoloth"] },
] as const;

export function collectSummoningReferenceAliases(article: Pick<AnalysisArticle, "slug" | "ruleset">, targets: readonly HydrationTarget[]): HydrationTarget[] {
  if (article.ruleset !== "RULES_2014" || article.slug !== "summoning-2014") return [];
  return SUMMONED_SPIRIT_FORMS.flatMap(({ spirit, sectionId, forms }) => {
    const parent = targets.find((target) => target.kind === "creature" && target.engName === spirit && target.href.startsWith("/bestiary?creature="));
    return parent ? forms.map((engName) => ({ ...parent, name: engName, engName, sectionId,
      linkPlainText: false, markerOnly: true, priority: Math.max(parent.priority ?? 0, 3) })) : [];
  });
}
