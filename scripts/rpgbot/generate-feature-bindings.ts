import { readFile, readdir, writeFile } from "node:fs/promises";
import { getAllClasses, type ClassData, type SubclassData, type ClassFeature } from "../../src/lib/classesData";
import { findFeatureKey, findPlainEnglishName } from "../../src/lib/catalogs/reading-target";
import { z } from "zod";
import { bindingSchema, entitySchema } from "../../src/lib/optimization/schema";
import { entityIdentity } from "../../src/lib/optimization/bindings";
import { readSourceManifest } from "../../src/lib/optimization/source-policy";
import { parseArticleDocument } from "../../src/lib/optimization/document";
import { toEntitySlug } from "../../src/lib/slug-utils";
import { joinLeadingMarkers } from "../../src/lib/optimization/inline-view";
import type { ArticleDocument, EntityBinding, InlineNode } from "../../src/lib/optimization/types";

const REVIEWED_FEATURE_NAMES: Record<string, string> = {
  "Cloak of Shadows (Way of Shadow)": "Cloak of Shadows",
  "Bonus Proficiencies (Drunken Master)": "Bonus Proficiencies",
};

const RPGBOT_SUBCLASS_SLUGS: Record<string, string> = { BANNERET: "purple-dragon-knight" };

function normalizeName(name: string) {
  return findPlainEnglishName(REVIEWED_FEATURE_NAMES[name] ?? name).replace(/\s*\([^)]*\)$/, "").replace(/[’‘]/g, "'").toLowerCase();
}

type FeatureOption = { blockId: string; optionId: string; content: InlineNode[] };

function collectSectionOptions(document: ArticleDocument, sectionId: string): FeatureOption[] {
  const section = document.translations.at(-1)!.sections.find((entry) => entry.sectionId === sectionId);
  return section?.blocks.flatMap((block) => block.type === "list"
    ? block.items.map((content, index) => ({ content, blockId: block.blockId, optionId: `${sectionId}-${block.blockId}-item-${index}` })) : []) ?? [];
}

function findOptionFeature(subclass: SubclassData, option: FeatureOption) {
  const label = joinLeadingMarkers(option.content)[0].text;
  const marker = label.match(/^(?:[^{}:]*?)\{\{(?:[^|{}]*\|)?([^{}|]+)\}\}/);
  const matches = marker ? subclass.features.filter((feature) => normalizeName(feature.engName) === normalizeName(marker[1])
    || (marker[1] === "Domain Spells" && feature.engName.endsWith(" Domain Spells"))) : [];
  return matches.length === 1 ? matches[0] : undefined;
}

function buildFeatureBinding(document: ArticleDocument, subclass: SubclassData, feature: ClassFeature, source: { classKey: string; sectionId: string; option: FeatureOption }): EntityBinding {
  const { classKey, sectionId, option: { content, optionId, blockId } } = source;
  const entityKey = findFeatureKey(feature);
  return {
    bindingId: `binding-${document.article.ruleset === "RULES_2014" ? "2014" : "2024"}-${subclass.key.toLowerCase()}-${entityKey}`,
    entity: { ruleset: document.article.ruleset, kind: "feature", parentKey: subclass.key, entityKey },
    articleId: document.article.articleId, sectionId, optionId,
    role: "comparison", primary: true, preview: content.map((node) => node.text).join("").slice(0, 600),
    ratingIds: document.ratings.filter((rating) => rating.translationRevisionId === document.translations.at(-1)!.translationRevisionId && rating.sectionId === sectionId && rating.targetBlockId === blockId && rating.optionId === optionId).map((rating) => rating.ratingId),
    evidence: `src/lib/generated/classes.json: ${classKey} → ${subclass.key} → ${feature.engName}, level ${feature.level}; ${document.article.articleId}: ${optionId}; English label verified within this subclass and level; catalog description checked against the named ability.`,
    reviewedAt: "2026-10-04T00:00:00Z",
  };
}

function collectSubclassBindings(document: ArticleDocument, subclass: SubclassData, parent: EntityBinding) {
  const candidates: EntityBinding[] = [];
  const unmatched: string[] = [];
  for (const option of collectSectionOptions(document, parent.sectionId)) {
    const feature = findOptionFeature(subclass, option);
    const duplicate = feature && candidates.some((binding) => binding.entity.entityKey === findFeatureKey(feature));
    if (!feature || duplicate) {
      unmatched.push(`${subclass.key}: ${option.optionId}: ${option.content[0].text.split(":")[0]}${duplicate ? " (duplicate)" : ""}`);
      continue;
    }
    candidates.push(buildFeatureBinding(document, subclass, feature, { classKey: parent.entity.parentKey!, sectionId: parent.sectionId, option }));
  }
  return { candidates, unmatched };
}

export function collectFeatureBindingCandidates(characterClass: ClassData, document: ArticleDocument, bindings: readonly EntityBinding[]) {
  const parents = bindings.filter((binding) => binding.entity.kind === "subclass" && binding.entity.ruleset === characterClass.ruleset && binding.entity.parentKey === characterClass.key && binding.articleId === document.article.articleId);
  const matches = parents.map((parent) => {
    const subclass = characterClass.subclasses.find((entry) => entry.key === parent.entity.entityKey);
    if (!subclass) throw new Error(`Missing subclass: ${parent.entity.entityKey}`);
    return collectSubclassBindings(document, subclass, parent);
  });
  return { candidates: matches.flatMap((match) => match.candidates), unmatched: matches.flatMap((match) => match.unmatched) };
}


function buildDedicatedParentBinding(characterClass: ClassData, subclass: SubclassData, document: ArticleDocument, section: ArticleDocument["translations"][number]["sections"][number]): EntityBinding {
  return { bindingId: `binding-${document.article.slug}-${subclass.key.toLowerCase()}`,
    entity: { ruleset: document.article.ruleset, kind: "subclass", parentKey: characterClass.key, entityKey: subclass.key },
    articleId: document.article.articleId, sectionId: section.sectionId, role: "comparison", primary: true,
    preview: section.heading, ratingIds: [], evidence: "Exact native subclass in article topics; unique feature section identity.", reviewedAt: "2026-10-09T00:00:00Z" };
}

function collectUnboundDedicatedCandidates(bindings: readonly EntityBinding[], generated: ReturnType<typeof collectSubclassBindings>[]) {
  const candidates = generated.flatMap((entry) => entry.candidates).filter((candidate) => !bindings.some((binding) =>
    entityIdentity(binding.entity) === entityIdentity(candidate.entity) && binding.primary));
  const counts = new Map<string, number>();
  for (const candidate of candidates) counts.set(entityIdentity(candidate.entity), (counts.get(entityIdentity(candidate.entity)) ?? 0) + 1);
  return candidates.filter((candidate) => counts.get(entityIdentity(candidate.entity)) === 1);
}

export function collectDedicatedFeatureBindingCandidates(characterClass: ClassData, document: ArticleDocument, bindings: readonly EntityBinding[]) {
  const subclasses = characterClass.subclasses.filter((subclass) => document.article.topics.includes(subclass.name));
  if (subclasses.length !== 1 || document.article.ruleset !== characterClass.ruleset) return { candidates: [], unmatched: [] };
  const subclass = subclasses[0];
  const sections = document.translations.at(-1)!.sections.filter((section) => /(?:^|-)(?:subclass-)?features$/.test(section.sectionId));
  if (sections.length !== 1) return { candidates: [], unmatched: [] };
  const parent = buildDedicatedParentBinding(characterClass, subclass, document, sections[0]);
  const generated = collectSubclassBindings(document, subclass, parent);
  const parents = bindings.some((binding) => entityIdentity(binding.entity) === entityIdentity(parent.entity) && binding.primary) ? [] : [parent];
  const candidates = collectUnboundDedicatedCandidates(bindings, [generated]).map((candidate) => ({ ...candidate,
    bindingId: `binding-${document.article.slug}-${candidate.entity.entityKey}`, reviewedAt: "2026-10-09T00:00:00Z" }));
  return { candidates: [...parents, ...candidates], unmatched: generated.unmatched };
}

async function saveFeatureBindings(bindings: EntityBinding[], candidates: EntityBinding[]) {
  const ids = new Set(candidates.map((binding) => binding.bindingId));
  await writeFile("data/rpgbot/bindings.json", JSON.stringify([...bindings.filter((binding) => !ids.has(binding.bindingId)), ...candidates], null, 2) + "\n");
  const keysPath = "data/rpgbot/entity-keys.json";
  const keys = z.array(entitySchema).parse(JSON.parse(await readFile(keysPath, "utf8")));
  const identities = new Set(keys.map(entityIdentity));
  for (const { entity } of candidates) if (!identities.has(entityIdentity(entity))) { keys.push(entity); identities.add(entityIdentity(entity)); }
  await writeFile(keysPath, JSON.stringify(keys, null, 2) + "\n");
}

function collectComparisonParents(characterClass: ClassData, document: ArticleDocument): EntityBinding[] {
  return characterClass.subclasses.flatMap((subclass) => {
    const slug = RPGBOT_SUBCLASS_SLUGS[subclass.key] ?? toEntitySlug(findPlainEnglishName(subclass.engName)).replace(/-conclave$/, "").replace(/^school-of-/, "");
    const sections = document.translations.at(-1)!.sections.filter((section) => section.sectionId === `section-${slug}`
      || section.heading === subclass.name || section.heading.startsWith(`${subclass.name} (`));
    if (sections.length !== 1) return [];
    const section = sections[0];
    return [{ bindingId: `binding-2014-${subclass.key.toLowerCase()}`, entity: { ruleset: "RULES_2014", kind: "subclass", parentKey: characterClass.key, entityKey: subclass.key },
      articleId: document.article.articleId, sectionId: section.sectionId, role: "comparison", primary: true, preview: section.heading, ratingIds: [],
      evidence: `2014 catalog ${characterClass.key} → ${subclass.key}; exact comparison section ${section.sectionId}: ${section.heading}.`, reviewedAt: "2026-10-04T00:00:00Z" }];
  });
}

async function readComparisonBindings(filename: string, classes: ClassData[], bindings: EntityBinding[]) {
  const document = parseArticleDocument(JSON.parse(await readFile(`data/rpgbot/uk/${filename}`, "utf8")));
  const characterClass = classes.find((entry) => document.article.slug === `${entry.slug}-subclasses-2014`);
  if (!characterClass) throw new Error(`Missing comparison class: ${document.article.slug}`);
  const known = new Set(bindings.map((binding) => binding.bindingId));
  const parents = collectComparisonParents(characterClass, document).filter((parent) => !known.has(parent.bindingId));
  const generated = collectFeatureBindingCandidates(characterClass, document, [...bindings, ...parents]);
  return { candidates: [...parents, ...generated.candidates], unmatched: generated.unmatched };
}

export async function collectAll2014Bindings(bindings: EntityBinding[]) {
  const classes = getAllClasses("RULES_2014");
  const candidates: EntityBinding[] = [];
  const unmatched: string[] = [];
  for (const filename of (await readdir("data/rpgbot/uk")).filter((name) => /^rpgbot-.+-subclasses-2014\.json$/.test(name)).sort()) {
    const generated = await readComparisonBindings(filename, classes, bindings);
    candidates.push(...generated.candidates);
    unmatched.push(...generated.unmatched);
  }
  return { candidates, unmatched };
}

export async function collectAll2014DedicatedBindings(bindings: EntityBinding[]) {
  const included = new Set((await readSourceManifest("data/rpgbot/manifest.json"))
    .filter((entry) => entry.disposition === "included" && entry.rulesets.includes("2014")).map((entry) => entry.sourceId));
  const classes = getAllClasses("RULES_2014");
  const candidates: EntityBinding[] = [];
  const unmatched: string[] = [];
  const names = (await readdir("data/rpgbot/uk")).filter((name) => name.endsWith("-2014.json") && !name.endsWith("-subclasses-2014.json")).sort();
  for (const name of names) {
    const document = parseArticleDocument(JSON.parse(await readFile(`data/rpgbot/uk/${name}`, "utf8")));
    if (!included.has(document.article.sourceId)) continue;
    const parents = classes.filter((characterClass) => document.article.topics.includes(characterClass.name));
    if (parents.length !== 1) continue;
    const generated = collectDedicatedFeatureBindingCandidates(parents[0], document, [...bindings, ...candidates]);
    candidates.push(...generated.candidates);
    unmatched.push(...generated.unmatched);
  }
  return { candidates, unmatched };
}

async function generateFeatureBindings() {
  const path = "data/rpgbot/bindings.json";
  const bindings = z.array(bindingSchema).parse(JSON.parse(await readFile(path, "utf8")));
  const characterClass = getAllClasses("RULES_2014").find((entry) => entry.key === "MONK_2014")!;
  const document = parseArticleDocument(JSON.parse(await readFile("data/rpgbot/uk/rpgbot-monk-subclasses-2014.json", "utf8")));
  const generated = process.argv.includes("--dedicated-2014") ? await collectAll2014DedicatedBindings(bindings)
    : process.argv.includes("--all-2014") ? await collectAll2014Bindings(bindings)
    : collectFeatureBindingCandidates(characterClass, document, bindings);
  console.log(JSON.stringify(generated, null, 2));
  if (process.argv.includes("--apply")) await saveFeatureBindings(bindings, generated.candidates);
}

if (process.argv[1]?.endsWith("generate-feature-bindings.ts")) await generateFeatureBindings();
