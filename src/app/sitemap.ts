import type { MetadataRoute } from "next";
import { buildSpellKey, getAllSpells } from "@/lib/spellsData";
import { getAllMagicItems } from "@/lib/magicItemsData";
import { getAllWeapons } from "@/lib/weaponsData";
import { getAllArmors } from "@/lib/armorData";
import { getAllInfusions } from "@/lib/infusionsData";
import { getAllInvocations } from "@/lib/invocationsData";
import { getAllCreatures } from "@/lib/bestiaryData";
import { getAllBackgrounds } from "@/lib/backgroundsData";
import { getAllBastionFacilities } from "@/lib/bastionsData";
import { getAllRuleArticles2014 } from "@/lib/rules2014Data";
import { getAllRuleArticles2024 } from "@/lib/rules2024Data";
import { getAllRuleCategories } from "@/lib/rulesData";
import { toEntitySlug } from "@/lib/slug-utils";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://char.holota.family";

export default function sitemap(): MetadataRoute.Sitemap {
  const spells = getAllSpells();
  const spells2024 = getAllSpells("RULES_2024");
  const magicItems = getAllMagicItems();
  const weapons = getAllWeapons("RULES_2014");
  const armors = getAllArmors("RULES_2014");
  const infusions = getAllInfusions();
  const invocations = getAllInvocations("RULES_2014");
  const creatures = getAllCreatures("RULES_2014");
  const backgrounds = getAllBackgrounds("RULES_2014");
  const bastionFacilities = getAllBastionFacilities();
  const ruleCategories = getAllRuleCategories();

  return [
    // Main spells page
    { url: `${siteUrl}/spells`, lastModified: new Date() },
    // Individual spell pages — ключ у адресі слаг, номер лишається робочим (KR25.2)
    ...spells.map((s) => ({
      url: `${siteUrl}/spells/${buildSpellKey(s)}`,
      lastModified: new Date(),
    })),
    { url: `${siteUrl}/2024/spells`, lastModified: new Date() },
    ...spells2024.map((s) => ({
      url: `${siteUrl}/2024/spells/${buildSpellKey(s)}`,
      lastModified: new Date(),
    })),
    // Main magic items page
    { url: `${siteUrl}/magic-items`, lastModified: new Date() },
    // Individual magic item pages
    ...magicItems.map((item) => ({
      url: `${siteUrl}/magic-items/${item.magicItemId}`,
      lastModified: new Date(),
    })),
    // Main catalog pages
    { url: `${siteUrl}/weapons`, lastModified: new Date() },
    { url: `${siteUrl}/armor`, lastModified: new Date() },
    { url: `${siteUrl}/infusions`, lastModified: new Date() },
    { url: `${siteUrl}/invocations`, lastModified: new Date() },
    { url: `${siteUrl}/feats`, lastModified: new Date() },
    { url: `${siteUrl}/bestiary`, lastModified: new Date() },
    { url: `${siteUrl}/backgrounds`, lastModified: new Date() },
    { url: `${siteUrl}/races`, lastModified: new Date() },
    { url: `${siteUrl}/classes`, lastModified: new Date() },
    /// Бастіонів у 2014 немає — це єдиний каталог, який існує лише в редакції 2024.
    { url: `${siteUrl}/2024/bastions`, lastModified: new Date() },
    // Individual weapon pages
    ...weapons.map((w) => ({
      url: `${siteUrl}/weapons/${toEntitySlug(w.engName)}`,
      lastModified: new Date(),
    })),
    // Individual armor pages
    ...armors.map((a) => ({
      url: `${siteUrl}/armor/${toEntitySlug(a.engName)}`,
      lastModified: new Date(),
    })),
    // Individual infusion pages
    ...infusions.map((i) => ({
      url: `${siteUrl}/infusions/${toEntitySlug(i.engName)}`,
      lastModified: new Date(),
    })),
    // Individual invocation pages
    ...invocations.map((inv) => ({
      url: `${siteUrl}/invocations/${toEntitySlug(inv.engName)}`,
      lastModified: new Date(),
    })),
    // Individual creature pages
    ...creatures.map((c) => ({
      url: `${siteUrl}/bestiary/${toEntitySlug(c.nameEng)}`,
      lastModified: new Date(),
    })),
    // Individual background pages
    ...backgrounds.map((b) => ({
      url: `${siteUrl}/backgrounds/${b.slug}`,
      lastModified: new Date(),
    })),
    // Individual bastion facility pages
    ...bastionFacilities.map((facility) => ({
      url: `${siteUrl}/2024/bastions/${facility.slug}`,
      lastModified: new Date(),
    })),
    // Rules reference: category pages of both editions
    ...ruleCategories.flatMap((category) => [
      { url: `${siteUrl}/rules/${category.key}`, lastModified: new Date() },
      { url: `${siteUrl}/2024/rules/${category.key}`, lastModified: new Date() },
    ]),
    { url: `${siteUrl}/rules`, lastModified: new Date() },
    { url: `${siteUrl}/2024/rules`, lastModified: new Date() },
    // Rules reference: every article as an anchor on its category page
    ...getAllRuleArticles2014().map((article) => ({
      url: `${siteUrl}/rules/${article.category}#${article.slug}`,
      lastModified: new Date(),
    })),
    ...getAllRuleArticles2024().map((article) => ({
      url: `${siteUrl}/2024/rules/${article.category}#${article.slug}`,
      lastModified: new Date(),
    })),
    // Home page
    { url: siteUrl, lastModified: new Date() },
  ];
}

