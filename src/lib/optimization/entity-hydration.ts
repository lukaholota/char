import { getAllFeats } from "@/lib/featsData";
import { getAllMagicItems } from "@/lib/magicItemsData";
import { getAllBackgrounds } from "@/lib/backgroundsData";
import { getAllInvocations } from "@/lib/invocationsData";
import { getAllInfusions } from "@/lib/infusionsData";
import { getAllMetamagic } from "@/lib/metamagicData";
import { getAllClasses } from "@/lib/classesData";
import { getAllRaces } from "@/lib/racesData";
import { getAllRuleArticles2014 } from "@/lib/rules2014Data";
import { getAllRuleArticles2024 } from "@/lib/rules2024Data";
import { buildClassReadingHref, buildRaceReadingHref, findBranchKey, findTraitKey, findPlainEnglishName } from "@/lib/catalogs/reading-target";
import { toEntitySlug } from "@/lib/slug-utils";
import type { AnalysisArticle, ContentReference, OptimizationRuleset } from "./types";
import type { HydrationTarget } from "./content-hydration";

function buildReference(kind: ContentReference["kind"], href: string, entry: { name: string; engName: string; description: string | null }): ContentReference {
  return { kind, href, name: entry.name, engName: entry.engName, description: entry.description ?? undefined, details: [] };
}

function collectOptionReferences(ruleset: OptimizationRuleset, prefix: string) {
  return [
    ...getAllInvocations(ruleset).map((entry) => buildReference("invocation", `${prefix}/invocations/${toEntitySlug(entry.engName)}`, { ...entry, name: entry.nameUa })),
    ...getAllMetamagic(ruleset).map((entry) => buildReference("metamagic", `${prefix}/metamagic/${toEntitySlug(entry.engName)}`, { ...entry, name: entry.nameUa })),
    ...(ruleset === "RULES_2014" ? getAllInfusions().map((entry) => buildReference("infusion", `/infusions/${toEntitySlug(entry.engName)}`, { ...entry, name: entry.nameUa })) : []),
  ];
}

function collectClassReferences(ruleset: OptimizationRuleset, prefix: string) {
  return getAllClasses(ruleset).flatMap((entry) => [
    buildReference("class", buildClassReadingHref(prefix, { classKey: entry.slug, subclassKey: null, featureKey: null }), { ...entry, description: buildClassDescription(entry) }),
    ...entry.subclasses.map((subclass) => buildReference("subclass", buildClassReadingHref(prefix, { classKey: entry.slug, subclassKey: subclass.slug, featureKey: null }), { ...subclass, description: buildClassDescription(subclass) })),
  ]);
}

function buildClassDescription(entry: { description: string | null; features: { name: string; level: number; description: string }[] }) {
  return [entry.description, ...entry.features.map((feature) => `### ${feature.name} · ${feature.level}-й рівень\n\n${feature.description}`)]
    .filter(Boolean).join("\n\n");
}

function collectRaceReferences(ruleset: OptimizationRuleset, prefix: string) {
  return getAllRaces(ruleset).flatMap((race) => {
    const href = buildRaceReadingHref(prefix, { raceKey: race.slug, branch: null, featureKey: null });
    const traits = race.traits.map((trait) => ({ ...buildReference("feature", buildRaceReadingHref(prefix, { raceKey: race.slug, branch: null, featureKey: findTraitKey(trait) }), { ...trait, engName: findPlainEnglishName(trait.engName) }), details: [{ label: "Раса", value: race.name }] }));
    const branches = (["subrace", "variant"] as const).flatMap((kind) => (kind === "subrace" ? race.subraces : race.variants).flatMap((branch) => {
      const target = { raceKey: race.slug, branch: { kind, key: findBranchKey(branch) }, featureKey: null };
      return [buildReference("race", buildRaceReadingHref(prefix, target), { ...branch, description: buildRaceDescription(branch) }), ...branch.traits.map((trait) => ({ ...buildReference("feature", buildRaceReadingHref(prefix, { ...target, featureKey: findTraitKey(trait) }), { ...trait, engName: findPlainEnglishName(trait.engName) }), details: [{ label: "Раса", value: race.name }, { label: "Варіант", value: branch.name }] }))];
    }));
    return [buildReference("race", href, { ...race, description: buildRaceDescription(race) }), ...traits, ...branches];
  });
}

function buildRaceDescription(race: { description: string | null; traits: { name: string; description: string | null }[] }) {
  return [race.description, ...race.traits.map((trait) => `**${trait.name}**\n\n${trait.description ?? ""}`)].filter(Boolean).join("\n\n");
}

function collectRuleReferences(ruleset: OptimizationRuleset, prefix: string) {
  const articles = ruleset === "RULES_2024" ? getAllRuleArticles2024() : getAllRuleArticles2014();
  return articles.map((article) => buildReference("rule", `${prefix}/rules/${article.category}#${article.slug}`, {
    name: article.title, engName: article.engTitle,
    description: article.subsections.map((section) => `**${section.title}**\n\n${section.content}`).join("\n\n"),
  }));
}

export function collectArticleRaceTargets(article: Pick<AnalysisArticle, "slug" | "ruleset">, targets: readonly HydrationTarget[]): HydrationTarget[] {
  const slug = article.slug.replace(/-(?:2014|2024)$/, "");
  const race = getAllRaces(article.ruleset).find((entry) => entry.slug === slug);
  if (!race) return [];
  const prefix = article.ruleset === "RULES_2024" ? "/2024" : "";
  const href = buildRaceReadingHref(prefix, { raceKey: race.slug, branch: null, featureKey: null });
  return targets.filter((target) => target.href === href || target.href.startsWith(`${href}&feature=`))
    .map((target) => ({ ...target, priority: 2 }));
}

export function collectEntityReferences(ruleset: OptimizationRuleset): ContentReference[] {
  const prefix = ruleset === "RULES_2024" ? "/2024" : "";
  return [
    ...getAllFeats(ruleset).map((entry) => buildReference("feat", `${prefix}/feats?feat=${entry.featId}`, entry)),
    ...getAllMagicItems(ruleset).map((entry) => buildReference("magic-item", `${prefix}/magic-items/${entry.magicItemId}`, entry)),
    ...getAllBackgrounds(ruleset).map((entry) => buildReference("background", `${prefix}/backgrounds/${entry.backgroundId}`, entry)),
    ...collectOptionReferences(ruleset, prefix), ...collectClassReferences(ruleset, prefix), ...collectRaceReferences(ruleset, prefix), ...collectRuleReferences(ruleset, prefix),
  ];
}
