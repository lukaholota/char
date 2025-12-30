import type { MetadataRoute } from "next";
import { getAllSpells } from "@/lib/spellsData";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://char.holota.family";
import { getAllMagicItems } from "@/lib/magicItemsData";

export default function sitemap(): MetadataRoute.Sitemap {
  const spells = getAllSpells();
  const magicItems = getAllMagicItems();

  return [
    // Main spells page
    { url: `${siteUrl}/spells`, lastModified: new Date() },
    // Individual spell pages
    ...spells.map((s) => ({
      url: `${siteUrl}/spells/${s.spellId}`,
      lastModified: new Date(),
    })),
    // Main magic items page
    { url: `${siteUrl}/magic-items`, lastModified: new Date() },
    // Individual magic item pages
    ...magicItems.map((item) => ({
      url: `${siteUrl}/magic-items/${item.magicItemId}`,
      lastModified: new Date(),
    })),
    // Home page
    { url: siteUrl, lastModified: new Date() },
  ];
}
