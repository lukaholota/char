import { getAllClasses, type ClassData, type ClassFeature, type SubclassData } from "@/lib/classesData";
import { buildClassReadingHref, findFeatureKey, findPlainEnglishName } from "@/lib/catalogs/reading-target";
import { toEntitySlug } from "@/lib/slug-utils";
import { normalizeContentName, type HydrationTarget } from "./content-hydration";
import { resolvePrimaryBinding } from "./bindings";
import type { AnalysisArticle, ContentReference, EntityBinding, TranslationRevision } from "./types";

type FeatureReference = { reference: ContentReference; target: HydrationTarget; classKey: string; classEngName: string; subclassKey: string | null; featureKey: string; level: number };
const COMPONENT_NAMES = [{ name: "Підскок на ноги", engName: "Leap to Your Feet" }, { name: "Перенаправлення атаки", engName: "Redirect Attack" }];

function buildFeatureReference(characterClass: ClassData, subclass: SubclassData | null, feature: ClassFeature): FeatureReference {
  const prefix = characterClass.ruleset === "RULES_2024" ? "/2024" : "";
  const href = buildClassReadingHref(prefix, { classKey: characterClass.slug, subclassKey: subclass?.slug ?? null, featureKey: findFeatureKey(feature) });
  const engName = stripFeatureOwner(feature.engName, characterClass, subclass);
  const reference: ContentReference = { kind: "feature", href, name: feature.name, engName: feature.engName,
    description: feature.description, details: [{ label: "Рівень", value: String(feature.level) }, { label: "Клас", value: characterClass.name },
      ...(subclass ? [{ label: "Підклас", value: subclass.name }] : [])] };
  return { reference, target: { name: feature.name, engName, href }, classKey: characterClass.key, classEngName: characterClass.engName, subclassKey: subclass?.key ?? null, featureKey: findFeatureKey(feature), level: feature.level };
}

function stripFeatureOwner(engName: string, characterClass: ClassData, subclass: SubclassData | null) {
  const plainName = findPlainEnglishName(engName).replace(/\s*\((?:Way of Shadow|Drunken Master)\)$/, "");
  const suffix = plainName.match(/\s*\(([^)]+)\)$/);
  const ownerNames = [characterClass.engName, subclass?.engName].filter((name): name is string => !!name);
  return suffix && ownerNames.some((name) => normalizeContentName(name) === normalizeContentName(suffix[1]))
    ? plainName.slice(0, suffix.index).trim() : plainName;
}

function collectFeatureReferences(classes: ClassData[]): FeatureReference[] {
  return classes.flatMap((characterClass) => [...characterClass.features.map((feature) => buildFeatureReference(characterClass, null, feature)),
    ...characterClass.subclasses.flatMap((subclass) => subclass.features.map((feature) => buildFeatureReference(characterClass, subclass, feature)))]);
}

function matchesSubclassSection(section: TranslationRevision["sections"][number], subclass: SubclassData) {
  const heading = normalizeContentName(section.heading);
  const name = normalizeContentName(subclass.name);
  const slug = toEntitySlug(findPlainEnglishName(subclass.engName));
  return heading === name || heading.startsWith(`${name} (`) || section.sectionId === `section-${slug}` || section.sectionId.startsWith(`section-${slug}-`);
}

function collectSectionScopes(article: AnalysisArticle, revisions: TranslationRevision[], classes: ClassData[], articleSubclassKey?: string) {
  const characterClass = classes.find((entry) => entry.name === article.topics[0])
    ?? classes.find((entry) => entry.subclasses.some((subclass) => subclass.key === articleSubclassKey));
  return revisions.flatMap((revision) => revision.sections.map((section) => {
    const subclass = characterClass?.subclasses.find((entry) => entry.key === articleSubclassKey)
      ?? characterClass?.subclasses.find((entry) => matchesSubclassSection(section, entry));
    return { sectionId: section.sectionId, classKey: characterClass?.key, subclassKey: subclass?.key };
  }));
}

export function collectArticleFeatureHydration(article: AnalysisArticle, revisions: TranslationRevision[], bindings: readonly EntityBinding[], articleSubclassKey?: string) {
  const classes = getAllClasses(article.ruleset);
  const features = collectFeatureReferences(classes);
  for (const feature of features) attachBoundFeatureAnalysis(feature, bindings, article.ruleset);
  const scopes = collectSectionScopes(article, revisions, classes, articleSubclassKey);
  const targets = features.flatMap((feature) => [feature.target, { ...feature.target, engName: feature.reference.engName }, ...scopes.filter((scope) => scope.classKey === feature.classKey
    && (feature.subclassKey === null || scope.subclassKey === feature.subclassKey)).map((scope) => ({ ...feature.target, sectionId: scope.sectionId, priority: feature.subclassKey ? 2 : 1 }))]);
  const qualifiedClassTargets = features.filter((feature) => feature.subclassKey === null
    && !/\([^)]*\)$/.test(feature.reference.engName)).map((feature) => ({ ...feature.target,
      engName: `${feature.target.engName} (${feature.classEngName})`, priority: 1 }));
  const components = features.filter((feature) => feature.target.engName === "Tipsy Sway" && feature.subclassKey === "WAY_OF_THE_DRUNKEN_MASTER")
    .flatMap((feature) => COMPONENT_NAMES.map((component) => ({ ...component, href: feature.target.href })));
  const frenzyAliases = targets.filter((target) => target.engName === "Intoxicated Frenzy").map((target) => ({ ...target, engName: "Intoxicating Frenzy" }));
  const shortNames = targets.flatMap((target) => {
    const engName = target.engName.replace(/\s*\([^)]*\)\s*$/, "");
    return engName !== target.engName ? [{ ...target, engName }] : [];
  });
  return { references: features.map((feature) => feature.reference), targets: [...targets, ...qualifiedClassTargets, ...components, ...frenzyAliases, ...shortNames] };
}

function attachBoundFeatureAnalysis(feature: FeatureReference, bindings: readonly EntityBinding[], ruleset: AnalysisArticle["ruleset"]) {
  if (!feature.subclassKey) return;
  const featureKey = feature.featureKey;
  const bound = resolvePrimaryBinding(bindings, { ruleset, kind: "feature", parentKey: feature.subclassKey, entityKey: featureKey });
  if (bound.status === "resolved") feature.reference.feature = { entity: { ruleset, kind: "subclass", parentKey: feature.classKey, entityKey: feature.subclassKey }, featureKey,
    level: feature.level };
}
