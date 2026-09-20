import type { Edition } from "@/rules/route-helpers";
import {
  collectCatalogsOfEdition,
  findCatalogHomeTitle,
  findCatalogHref,
  type CatalogEntry,
  type HomeCardPlacement,
  type HomeCardTier,
} from "@/lib/catalogs/catalog-registry";
import type { HomeAccentName } from "./homeTokens";

export type { HomeCardPlacement, HomeCardTier } from "@/lib/catalogs/catalog-registry";

export type HomeCategory = {
  slug: string;
  title: string;
  placement: HomeCardPlacement;
  accent: HomeAccentName;
  href: string;
  noAiImageSrc?: string;
};

/// «desktop» і «phone» — дві картки однієї категорії, кожна видима лише на своїй ширині екрана.
export type HomeCardViewport = "all" | "desktop" | "phone";

export type HomeCard = {
  category: HomeCategory;
  tier: HomeCardTier;
  viewport: HomeCardViewport;
  imageSrc: string;
  noAiImageSrc?: string;
};

export type HomeCardRows = { heroes: HomeCard[]; tiles: HomeCard[] };

export const HOME_EDITION_HEADINGS: Record<Edition, { system: string; homePath: string }> = {
  "2014": { system: "D&D 5e", homePath: "/" },
  "2024": { system: "D&D 5.5e", homePath: "/2024" },
};

export function collectHomeCategories(edition: Edition): HomeCategory[] {
  return collectCatalogsOfEdition(edition).map((entry) => buildHomeCategory(entry, edition));
}

export function collectHomeCardRows(edition: Edition): HomeCardRows {
  const categories = collectHomeCategories(edition);
  const heroes = categories.filter((category) => category.placement === "hero");
  const desktopHeroes = categories.filter((category) => category.placement === "heroOnDesktop");
  const tiles = categories.filter((category) => category.placement === "tile");

  return {
    heroes: [
      ...heroes.map((category) => buildHomeCard(category, "hero", "all")),
      ...desktopHeroes.map((category) => buildHomeCard(category, "hero", "desktop")),
    ],
    tiles: [
      ...desktopHeroes.map((category) => buildHomeCard(category, "tile", "phone")),
      ...tiles.map((category) => buildHomeCard(category, "tile", "all")),
    ],
  };
}

function buildHomeCategory(entry: CatalogEntry, edition: Edition): HomeCategory {
  return {
    slug: entry.slug,
    title: findCatalogHomeTitle(entry.slug, edition),
    placement: entry.home.placement,
    accent: entry.home.accent,
    href: findCatalogHrefOrThrow(entry, edition),
    noAiImageSrc: entry.home.noAiImageSrc,
  };
}

/// Власник, 2026-09-19: у режимі без ШІ обкладинка з мануалу лишається лише на великій картці —
/// одна плитка з картинкою серед текстових рве сітку на телефоні.
function buildHomeCard(category: HomeCategory, tier: HomeCardTier, viewport: HomeCardViewport): HomeCard {
  return {
    category,
    tier,
    viewport,
    imageSrc: findHomeCoverSrc(category.slug, tier),
    noAiImageSrc: tier === "hero" ? category.noAiImageSrc : undefined,
  };
}

function findHomeCoverSrc(slug: string, tier: HomeCardTier): string {
  const directory = tier === "hero" ? "/images/home" : "/images/categories";
  return `${directory}/${slug}.webp`;
}

function findCatalogHrefOrThrow(entry: CatalogEntry, edition: Edition): string {
  const href = findCatalogHref(entry.slug, edition);
  if (!href) throw new Error(`Каталог «${entry.slug}» не існує в редакції ${edition}`);
  return href;
}
