import { readFile } from "node:fs/promises";
import { z } from "zod";
import { getAllSpells } from "@/lib/spellsData";
import { getAllWeapons } from "@/lib/weaponsData";
import { getAllArmors } from "@/lib/armorData";
import { formatArmorClass } from "@/lib/logic/equipment-stats";
import { buildSpellHref, buildSpellSlug } from "@/lib/spell-link";
import { listRuleTermLinks, type RuleTermLinkEntry } from "@/lib/term-link";
import ruleTermCards from "@/lib/generated/rule-term-cards.json";
import { toEntitySlug } from "@/lib/slug-utils";
import { damageTypeTranslations, weaponTypeTranslations, weaponPropertyTranslations } from "@/lib/refs/translation";
import { bindingSchema } from "./schema";
import { collectSectionCreatureAbilities, hydrateArticleRevision, type HydrationTarget } from "./content-hydration";
import { collectArticleFeatureHydration } from "./feature-hydration";
import { collectArticleRaceTargets, collectEntityReferences } from "./entity-hydration";
import { collectAmbiguousHydration } from "./ambiguous-hydration";
import { collectSupplementalReferences } from "./supplemental-hydration";
import { collectEntityAliases } from "./reference-aliases";
import { collectCreatureReferences, collectCreatureAbilityReferences, collectCreatureAbilityAliases, collectCreatureNameAliases } from "./creature-hydration";
import { hydrateReferenceSpellLinks } from "./reference-spell-links";
import { collectSummoningReferenceAliases } from "./summoning-reference-aliases";
import { collectContextualReferenceAliases } from "./contextual-reference-aliases";
import type { ArticleDocument, ContentReference, OptimizationRuleset } from "./types";

function stripEnglishLabel(name: string) {
  return name.replace(/\s*\[[^\]]+\]\s*$/, "");
}

function collectSpellTargets(ruleset: OptimizationRuleset): HydrationTarget[] {
  return getAllSpells(ruleset).map((spell) => ({ kind: "spell", name: stripEnglishLabel(spell.name), engName: spell.engName,
    href: buildSpellHref({ ruleset, spellKey: buildSpellSlug(spell.engName) }) }));
}

function collectTermTargets(ruleset: OptimizationRuleset): HydrationTarget[] {
  const targets = listRuleTermLinks().flatMap((entry) => collectRuleTermTarget(entry, ruleset));
  const surprise = ruleset === "RULES_2014" ? targets.find((target) => target.engName === "Surprise") : undefined;
  const lightProperty = targets.find((target) => target.engName === "Light (weapon property)");
  return [...targets, ...(surprise ? [{ ...surprise, engName: "Surprised", linkPlainText: false }] : []),
    ...(lightProperty ? [{ ...lightProperty, engName: "Light" }] : [])];
}

function collectRuleTermTarget(entry: RuleTermLinkEntry, ruleset: OptimizationRuleset): HydrationTarget[] {
  const href = entry[ruleset];
  const card = ruleTermCards[ruleset][entry.original as keyof typeof ruleTermCards[typeof ruleset]];
  const markerOnly = entry.markerOnly || (ruleset === "RULES_2014" && entry.original === "Resistance");
  const name = markerOnly ? card?.article?.subsection?.title
    : card?.condition?.name ?? card?.dictionary[0]?.term ?? card?.article?.subsection?.title;
  return href && name ? [{ name, engName: entry.original, href, linkPlainText: !markerOnly,
    markerOnly, priority: markerOnly ? 0 : 1 }] : [];
}

function collectEquipmentReferences(ruleset: OptimizationRuleset): ContentReference[] {
  const prefix = ruleset === "RULES_2024" ? "/2024" : "";
  return [...getAllWeapons(ruleset).map((weapon) => buildWeaponReference(weapon, prefix)),
    ...getAllArmors(ruleset).filter((armor) => armor.isStandardEquipment).map((armor) => buildArmorReference(armor, prefix))];
}

function buildWeaponReference(weapon: ReturnType<typeof getAllWeapons>[number], prefix: string): ContentReference {
  return { kind: "weapon", name: weapon.nameUa, engName: weapon.engName,
    href: `${prefix}/weapons/${toEntitySlug(weapon.engName)}`, description: weapon.description, details: [
      { label: "Шкода", value: `${weapon.damage} · ${damageTypeTranslations[weapon.damageType] ?? weapon.damageType}` },
      { label: "Категорія", value: weaponTypeTranslations[weapon.weaponType] ?? weapon.weaponType },
      ...(weapon.properties.length ? [{ label: "Властивості", value: weapon.properties.map((property) => weaponPropertyTranslations[property] ?? property).join(", ") }] : []),
      ...(weapon.normalRange ? [{ label: "Дальність", value: `${weapon.normalRange}/${weapon.longRange} фт` }] : []),
      ...(weapon.versatileDamage ? [{ label: "Шкода двома руками", value: weapon.versatileDamage }] : []),
      ...(weapon.weight ? [{ label: "Вага", value: weapon.weight }] : []),
      ...(weapon.cost ? [{ label: "Вартість", value: weapon.cost }] : []),
    ] };
}

function buildArmorReference(armor: ReturnType<typeof getAllArmors>[number], prefix: string): ContentReference {
  return { kind: "armor", name: armor.nameUa, engName: armor.engName,
    href: `${prefix}/armor/${toEntitySlug(armor.engName)}`, details: [
      { label: "КБ", value: formatArmorClass(armor) }, { label: "Вартість", value: armor.cost || "—" }, { label: "Вага", value: armor.weight || "—" },
      ...(armor.strengthReq ? [{ label: "Вимога Сили", value: String(armor.strengthReq) }] : []),
      ...(armor.stealthDisadvantage ? [{ label: "Непомітність", value: "Перешкода" }] : []),
    ] };
}

export async function hydrateArticleDocument<T extends Pick<ArticleDocument, "article" | "translations">>(document: T): Promise<T & { contentReferences: ContentReference[] }> {
  const ruleset = document.article.ruleset;
  const bindings = z.array(bindingSchema).parse(JSON.parse(await readFile("data/rpgbot/bindings.json", "utf8")));
  const articleSubclassKeys = z.record(z.string(), z.string()).parse(JSON.parse(await readFile("data/rpgbot/article-art.json", "utf8")));
  const features = collectArticleFeatureHydration(document.article, document.translations, bindings, articleSubclassKeys[document.article.slug]);
  const creatures = collectCreatureReferences(ruleset);
  const entities = [...collectEntityReferences(ruleset), ...creatures];
  const creatureAbilities = collectCreatureAbilityReferences(ruleset);
  const equipment = collectEquipmentReferences(ruleset);
  const targets = [...collectSpellTargets(ruleset), ...collectTermTargets(ruleset), ...equipment, ...entities, ...features.targets,
    ...creatureAbilities.map((reference) => ({ ...reference, priority: -1 })),
    ...collectCreatureAbilityAliases(ruleset, creatureAbilities), ...collectCreatureNameAliases(creatures)];
  const supplemental = collectSupplementalReferences(ruleset, targets);
  targets.push(...supplemental);
  targets.push(...collectEntityAliases(document.translations, [...entities, ...features.references, ...supplemental], targets, document.article));
  targets.push(...collectArticleRaceTargets(document.article, targets));
  targets.push(...collectSummoningReferenceAliases(document.article, targets));
  targets.push(...collectContextualReferenceAliases(document.article, targets));
  const references = [...equipment, ...entities, ...features.references, ...supplemental, ...creatureAbilities];
  const spellReferences: ContentReference[] = getAllSpells(ruleset).map((spell) => ({ kind: "spell", name: stripEnglishLabel(spell.name), engName: spell.engName, description: spell.description,
    href: buildSpellHref({ ruleset, spellKey: buildSpellSlug(spell.engName) }), details: [{ label: "Рівень заклинання", value: String(spell.level) }] }));
  targets.push(...collectSectionCreatureAbilities(document.translations, targets));
  const alternatives = collectAmbiguousHydration(document.translations, targets, [...references, ...spellReferences]);
  const translations = document.translations.map((revision) => hydrateArticleRevision(revision, [...targets, ...alternatives.targets]));
  const usedHrefs = new Set(translations.flatMap((revision) => revision.sections.flatMap((section) => section.blocks.flatMap(collectBlockLinks))));
  const contentReferences = [...new Map([...references, ...alternatives.references].filter((reference) => usedHrefs.has(reference.href)).map((reference) => [reference.href, reference])).values()];
  return { ...document, translations, contentReferences: hydrateReferenceSpellLinks(contentReferences, getAllSpells(ruleset), ruleset) };
}

export function collectBlockLinks(block: import("./types").ContentBlock) {
  const nodes = block.type === "rating" ? [] : block.type === "list" ? block.items.flat()
    : block.type === "table" ? [...(block.caption ?? []), ...block.headers.flat(), ...block.rows.flat(2)] : block.content;
  return nodes.filter((node) => node.type === "link").map((node) => node.href);
}
