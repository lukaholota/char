import type { MetadataRoute } from "next";
import type { Ruleset } from "@prisma/client";
import { buildSpellKey, getAllSpells } from "@/lib/spellsData";
import { getAllMagicItems } from "@/lib/magicItemsData";
import { getAllWeapons } from "@/lib/weaponsData";
import { getAllArmors } from "@/lib/armorData";
import { getAllInfusions } from "@/lib/infusionsData";
import { getAllInvocations } from "@/lib/invocationsData";
import { getAllMetamagic } from "@/lib/metamagicData";
import { getAllCreatures } from "@/lib/bestiaryData";
import { getAllBackgrounds } from "@/lib/backgroundsData";
import { getAllBastionFacilities } from "@/lib/bastionsData";
import { getAllRuleArticles2014 } from "@/lib/rules2014Data";
import { getAllRuleArticles2024 } from "@/lib/rules2024Data";
import { getAllRuleCategories } from "@/lib/rulesData";
import { toEntitySlug } from "@/lib/slug-utils";
import { CATALOG_REGISTRY, findCatalogHref, toEdition } from "@/lib/catalogs/catalog-registry";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://char.holota.family";

const EDITION_PREFIX: Record<Ruleset, string> = { RULES_2014: "", RULES_2024: "/2024" };

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...collectEditionPaths("RULES_2014"),
    ...getAllInfusions().map((infusion) => `/infusions/${toEntitySlug(infusion.engName)}`),
    "/2024",
    ...collectEditionPaths("RULES_2024"),
    ...collectBastionPaths(),
    ...collectRulePaths(),
    "",
  ].map((path) => ({ url: `${siteUrl}${path}`, lastModified: new Date() }));
}

/// Корені каталогів ідуть із реєстру (O36): публічний каталог, що існує в цій редакції, має адресу
/// саме там, а не в шостій копії списку.
function collectCatalogRoots(ruleset: Ruleset): string[] {
  const edition = toEdition(ruleset);
  return CATALOG_REGISTRY.filter((entry) => entry.isPublic).flatMap((entry) => findCatalogHref(entry.slug, edition) ?? []);
}

function collectEditionPaths(ruleset: Ruleset): string[] {
  const prefix = EDITION_PREFIX[ruleset];
  return [
    ...collectCatalogRoots(ruleset),
    ...getAllSpells(ruleset).map((spell) => `${prefix}/spells/${buildSpellKey(spell)}`),
    ...getAllMagicItems(ruleset).map((item) => `${prefix}/magic-items/${item.magicItemId}`),
    ...getAllWeapons(ruleset).map((weapon) => `${prefix}/weapons/${toEntitySlug(weapon.engName)}`),
    ...getAllArmors(ruleset).map((armor) => `${prefix}/armor/${toEntitySlug(armor.engName)}`),
    ...getAllInvocations(ruleset).map((invocation) => `${prefix}/invocations/${toEntitySlug(invocation.engName)}`),
    ...getAllMetamagic(ruleset).map((metamagic) => `${prefix}/metamagic/${toEntitySlug(metamagic.engName)}`),
    ...getAllCreatures(ruleset).map((creature) => `${prefix}/bestiary/${toEntitySlug(creature.nameEng)}`),
    ...getAllBackgrounds(ruleset).map((background) => `${prefix}/backgrounds/${background.slug}`),
  ];
}

/** Бастіонів у 2014 немає — це єдиний каталог, який існує лише в редакції 2024. */
function collectBastionPaths(): string[] {
  return getAllBastionFacilities().map((facility) => `/2024/bastions/${facility.slug}`);
}

function collectRulePaths(): string[] {
  return [
    ...getAllRuleCategories().flatMap((category) => [`/rules/${category.key}`, `/2024/rules/${category.key}`]),
    ...getAllRuleArticles2014().map((article) => `/rules/${article.category}#${article.slug}`),
    ...getAllRuleArticles2024().map((article) => `/2024/rules/${article.category}#${article.slug}`),
  ];
}
