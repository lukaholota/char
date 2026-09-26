import type { Ruleset } from "@prisma/client";
import type { LucideIcon } from "lucide-react";
import { Award, BookOpen, Castle, Eye, FlaskConical, ScrollText, Shield, Sparkles, Sword, Swords, Users, Wand2, Wrench } from "lucide-react";
import { getTargetEditionPath, type Edition } from "@/rules/route-helpers";
import type { HomeAccentName } from "@/components/home/homeTokens";

/// Один реєстр каталогу платформи (O36). До нього список каталогів був набраний руками пʼять
/// разів — плитки головної, меню, категорії пошуку, плитки й таби вікна пошуку — і всі пʼять
/// розходилися. Модуль свідомо не імпортує жодного каталожного JSON: підпис категорії потрібен
/// компонентам, яким індекс не потрібен (docs/STATE.md дефект №9).
export type CatalogSlug =
  | "characters"
  | "spells"
  | "magic-items"
  | "races"
  | "classes"
  | "bestiary"
  | "weapons"
  | "armor"
  | "feats"
  | "backgrounds"
  | "invocations"
  | "metamagic"
  | "rules"
  | "homebrew"
  | "infusions"
  | "bastions";

/// «hero» — велика картка першого ряду, «tile» — плитка, «heroOnDesktop» — велика в першому
/// ряду на десктопі, а на телефоні перша плитка (власник, 2026-09-18: бестіарій).
export type HomeCardPlacement = "hero" | "tile" | "heroOnDesktop";

/// Розмір, у якому картка намальована: у «heroOnDesktop» їх два, по одному на ширину екрана.
export type HomeCardTier = "hero" | "tile";

/// «index» — рядки каталогу лежать у статичному омні-індексі; «server» — каталог живе в базі й
/// шукається серверною дією (персонажі, хоумбрю), в індексі його рядків бути не може.
export type CatalogSearchMode = "index" | "server";

export type CatalogEntry = {
  slug: CatalogSlug;
  title: string;
  /// Лише там, де редакція 2024 перейменувала саму річ — «раса» стала «видом».
  title2024?: string;
  /// Коротший підпис плитки головної, коли повний не влазить у три рядки.
  homeTitle?: string;
  /// Підпис у вікні пошуку, коли він відрізняється від назви каталогу («Мої персонажі»).
  searchTitle?: string;
  /// Адреса 2014; адреса 2024 виводиться, а не пишеться вдруге.
  path: string;
  editions: readonly Edition[];
  home: { placement: HomeCardPlacement; accent: HomeAccentName; noAiImageSrc?: string };
  /// null — каталог у головній панелі навігації, а не в додатковому меню.
  menuIcon: LucideIcon | null;
  search: CatalogSearchMode;
  searchOrder: number;
  /// Публічний статичний каталог, який має бути в sitemap. Персонажі й хоумбрю — ні.
  isPublic: boolean;
};

const BOTH_EDITIONS = ["2014", "2024"] as const;
const ONLY_2014 = ["2014"] as const;
const ONLY_2024 = ["2024"] as const;

/// Порядок записів — порядок плиток головної (KR13.7); акценти — з таблиці
/// docs/o13-2024-completeness/image-prompts.md, під яку генерувалися обкладинки. У KR13.7 є ще
/// категорія «Дії» — вона без картки й без каталогу: дії живуть у довіднику правил (власник,
/// 2026-08-28).
export const CATALOG_REGISTRY: readonly CatalogEntry[] = [
  {
    slug: "characters",
    title: "Персонажі",
    searchTitle: "Мої персонажі",
    path: "/char/home",
    editions: BOTH_EDITIONS,
    home: { placement: "hero", accent: "arcaneViolet" },
    menuIcon: null,
    search: "server",
    searchOrder: 0,
    isPublic: false,
  },
  {
    slug: "spells",
    title: "Заклинання",
    path: "/spells",
    editions: BOTH_EDITIONS,
    home: { placement: "hero", accent: "runicCyan", noAiImageSrc: "/images/manual/spells.webp" },
    menuIcon: null,
    search: "index",
    searchOrder: 2,
    isPublic: true,
  },
  {
    slug: "homebrew",
    title: "Хоумбрю спільноти",
    homeTitle: "Хоумбрю",
    path: "/homebrew",
    editions: BOTH_EDITIONS,
    home: { placement: "tile", accent: "runicCyan" },
    menuIcon: FlaskConical,
    search: "server",
    searchOrder: 15,
    isPublic: false,
  },
  {
    slug: "magic-items",
    title: "Магічні предмети",
    homeTitle: "Маг. предмети",
    path: "/magic-items",
    editions: BOTH_EDITIONS,
    home: { placement: "tile", accent: "runicCyan" },
    menuIcon: null,
    search: "index",
    searchOrder: 3,
    isPublic: true,
  },
  {
    slug: "races",
    title: "Раси",
    title2024: "Види",
    path: "/races",
    editions: BOTH_EDITIONS,
    home: { placement: "tile", accent: "runicCyan" },
    menuIcon: Users,
    search: "index",
    searchOrder: 14,
    isPublic: true,
  },
  {
    slug: "classes",
    title: "Класи",
    path: "/classes",
    editions: BOTH_EDITIONS,
    home: { placement: "tile", accent: "emberGold" },
    menuIcon: Swords,
    search: "index",
    searchOrder: 13,
    isPublic: true,
  },
  {
    slug: "bestiary",
    title: "Бестіарій",
    path: "/bestiary",
    editions: BOTH_EDITIONS,
    home: { placement: "heroOnDesktop", accent: "ashenSteel", noAiImageSrc: "/images/manual/bestiary.webp" },
    menuIcon: Eye,
    search: "index",
    searchOrder: 5,
    isPublic: true,
  },
  {
    slug: "weapons",
    title: "Зброя",
    path: "/weapons",
    editions: BOTH_EDITIONS,
    home: { placement: "tile", accent: "emberGold" },
    menuIcon: Sword,
    search: "index",
    searchOrder: 7,
    isPublic: true,
  },
  {
    slug: "armor",
    title: "Обладунки",
    path: "/armor",
    editions: BOTH_EDITIONS,
    home: { placement: "tile", accent: "ashenSteel" },
    menuIcon: Shield,
    search: "index",
    searchOrder: 8,
    isPublic: true,
  },
  {
    slug: "feats",
    title: "Риси",
    path: "/feats",
    editions: BOTH_EDITIONS,
    home: { placement: "tile", accent: "emberGold" },
    menuIcon: Award,
    search: "index",
    searchOrder: 4,
    isPublic: true,
  },
  {
    slug: "backgrounds",
    title: "Походження",
    path: "/backgrounds",
    editions: BOTH_EDITIONS,
    home: { placement: "tile", accent: "emberGold" },
    menuIcon: ScrollText,
    search: "index",
    searchOrder: 6,
    isPublic: true,
  },
  {
    slug: "invocations",
    title: "Потойбічні виклики",
    path: "/invocations",
    editions: BOTH_EDITIONS,
    home: { placement: "tile", accent: "arcaneViolet" },
    menuIcon: Sparkles,
    search: "index",
    searchOrder: 9,
    isPublic: true,
  },
  {
    slug: "metamagic",
    title: "Метамагія",
    path: "/metamagic",
    editions: BOTH_EDITIONS,
    home: { placement: "tile", accent: "arcaneViolet" },
    menuIcon: Wand2,
    search: "index",
    searchOrder: 10,
    isPublic: true,
  },
  {
    slug: "rules",
    title: "Довідник правил",
    path: "/rules",
    editions: BOTH_EDITIONS,
    home: { placement: "tile", accent: "emberGold" },
    menuIcon: BookOpen,
    search: "index",
    searchOrder: 1,
    isPublic: true,
  },
  {
    slug: "infusions",
    title: "Вливання Винахідника",
    homeTitle: "Вливання",
    path: "/infusions",
    editions: ONLY_2014,
    home: { placement: "tile", accent: "runicCyan" },
    menuIcon: Wrench,
    search: "index",
    searchOrder: 11,
    isPublic: true,
  },
  {
    slug: "bastions",
    title: "Приміщення бастіону",
    homeTitle: "Бастіони",
    path: "/bastions",
    editions: ONLY_2024,
    home: { placement: "tile", accent: "emberGold" },
    menuIcon: Castle,
    search: "index",
    searchOrder: 12,
    isPublic: true,
  },
];

const entriesBySlug = new Map(CATALOG_REGISTRY.map((entry) => [entry.slug, entry]));

export function findCatalogEntry(slug: CatalogSlug): CatalogEntry {
  const entry = entriesBySlug.get(slug);
  if (!entry) throw new Error(`Каталогу «${slug}» немає в реєстрі`);
  return entry;
}

export function collectCatalogsOfEdition(edition: Edition): CatalogEntry[] {
  return CATALOG_REGISTRY.filter((entry) => entry.editions.includes(edition));
}

export function collectSearchCatalogs(edition: Edition): CatalogEntry[] {
  return collectCatalogsOfEdition(edition).sort((a, b) => a.searchOrder - b.searchOrder);
}

export function collectMenuCatalogs(edition: Edition): Array<CatalogEntry & { menuIcon: LucideIcon }> {
  return collectCatalogsOfEdition(edition).filter(hasMenuIcon);
}

function hasMenuIcon(entry: CatalogEntry): entry is CatalogEntry & { menuIcon: LucideIcon } {
  return entry.menuIcon !== null;
}

export function isCatalogInEdition(slug: CatalogSlug, edition: Edition): boolean {
  return findCatalogEntry(slug).editions.includes(edition);
}

/// Каталогу, якого в цій редакції немає, адреси не існує — ні плиткою, ні табом, ні
/// посиланням із результату. До реєстру `/bastions` для 2014 збирався з префікса й був мертвим.
export function findCatalogHref(slug: CatalogSlug, edition: Edition): string | null {
  const entry = findCatalogEntry(slug);
  if (!entry.editions.includes(edition)) return null;
  return getTargetEditionPath(entry.path, edition);
}

export function findCatalogTitle(slug: CatalogSlug, edition: Edition): string {
  const entry = findCatalogEntry(slug);
  return edition === "2024" ? (entry.title2024 ?? entry.title) : entry.title;
}

export function findCatalogHomeTitle(slug: CatalogSlug, edition: Edition): string {
  const entry = findCatalogEntry(slug);
  if (edition === "2024" && entry.title2024) return entry.title2024;
  return entry.homeTitle ?? entry.title;
}

export function findCatalogSearchTitle(slug: CatalogSlug, edition: Edition): string {
  return findCatalogEntry(slug).searchTitle ?? findCatalogTitle(slug, edition);
}

export function toEdition(ruleset: Ruleset): Edition {
  return ruleset === "RULES_2024" ? "2024" : "2014";
}

export function findRoutePrefix(ruleset: Ruleset): string {
  return ruleset === "RULES_2024" ? "/2024" : "";
}
