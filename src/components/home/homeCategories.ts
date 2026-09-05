import { getTargetEditionPath, type Edition } from "@/rules/route-helpers";
import type { HomeAccentName } from "./homeTokens";

export type HomeCardTier = "hero" | "tile";

export type HomeCategory = {
  slug: string;
  title: string;
  tier: HomeCardTier;
  accent: HomeAccentName;
  href: string;
  imageSrc: string;
  noAiImageSrc?: string;
};

type CategoryManifestEntry = {
  slug: string;
  title: string;
  tier: HomeCardTier;
  accent: HomeAccentName;
  /// 2014 path; the 2024 counterpart is derived, never written twice.
  path: string;
  editions: readonly Edition[];
  /// Set only where the 2024 revision renamed the thing — «раса» became «вид».
  title2024?: string;
  /// Ілюстрація з мануалу WotC, якою підмінюється згенерована обкладинка в режимі без ШІ.
  noAiImageSrc?: string;
};

/// The KR13.7 table also lists an "Дії" category. It gets no card and no cover: actions live
/// inside the rules reference (owner, 2026-08-28).
const BOTH_EDITIONS = ["2014", "2024"] as const;
const ONLY_2014 = ["2014"] as const;
const ONLY_2024 = ["2024"] as const;

/// Accents follow the table in docs/o13-2024-completeness/image-prompts.md, which is also what
/// the cover art was generated against — one accent per card, agreed once, not invented twice.
const HOME_CATEGORY_MANIFEST: readonly CategoryManifestEntry[] = [
  {
    slug: "characters",
    title: "Персонажі",
    tier: "hero",
    accent: "arcaneViolet",
    path: "/char/home",
    editions: BOTH_EDITIONS,
  },
  {
    slug: "spells",
    title: "Заклинання",
    tier: "hero",
    accent: "runicCyan",
    path: "/spells",
    editions: BOTH_EDITIONS,
    noAiImageSrc: "/images/manual/spells.webp",
  },
  {
    slug: "magic-items",
    title: "Маг. предмети",
    tier: "tile",
    accent: "runicCyan",
    path: "/magic-items",
    editions: BOTH_EDITIONS,
  },
  {
    slug: "races",
    title: "Раси",
    tier: "tile",
    accent: "runicCyan",
    path: "/races",
    editions: BOTH_EDITIONS,
    title2024: "Види",
  },
  {
    slug: "classes",
    title: "Класи",
    tier: "tile",
    accent: "emberGold",
    path: "/classes",
    editions: BOTH_EDITIONS,
  },
  {
    slug: "bestiary",
    title: "Бестіарій",
    tier: "tile",
    accent: "ashenSteel",
    path: "/bestiary",
    editions: BOTH_EDITIONS,
  },
  {
    slug: "weapons",
    title: "Зброя",
    tier: "tile",
    accent: "emberGold",
    path: "/weapons",
    editions: BOTH_EDITIONS,
  },
  {
    slug: "armor",
    title: "Обладунки",
    tier: "tile",
    accent: "ashenSteel",
    path: "/armor",
    editions: BOTH_EDITIONS,
  },
  {
    slug: "feats",
    title: "Риси",
    tier: "tile",
    accent: "emberGold",
    path: "/feats",
    editions: BOTH_EDITIONS,
  },
  {
    slug: "backgrounds",
    title: "Походження",
    tier: "tile",
    accent: "emberGold",
    path: "/backgrounds",
    editions: BOTH_EDITIONS,
  },
  {
    slug: "invocations",
    title: "Потойбічні виклики",
    tier: "tile",
    accent: "arcaneViolet",
    path: "/invocations",
    editions: BOTH_EDITIONS,
  },
  {
    slug: "rules",
    title: "Довідник правил",
    tier: "tile",
    accent: "emberGold",
    path: "/rules",
    editions: BOTH_EDITIONS,
  },
  {
    slug: "infusions",
    title: "Вливання",
    tier: "tile",
    accent: "runicCyan",
    path: "/infusions",
    editions: ONLY_2014,
  },
  {
    slug: "bastions",
    title: "Бастіони",
    tier: "tile",
    accent: "emberGold",
    path: "/bastions",
    editions: ONLY_2024,
  },
];

export const HOME_EDITION_HEADINGS: Record<Edition, { title: string }> = {
  "2014": { title: "D&D 5e · Редакція 2014" },
  "2024": { title: "D&D 5.5e · Редакція 2024" },
};

export function collectHomeCategories(edition: Edition): HomeCategory[] {
  return HOME_CATEGORY_MANIFEST.filter((entry) =>
    entry.editions.includes(edition),
  ).map((entry) => buildHomeCategory(entry, edition));
}

function buildHomeCategory(
  entry: CategoryManifestEntry,
  edition: Edition,
): HomeCategory {
  const imageDirectory =
    entry.tier === "hero" ? "/images/home" : "/images/categories";

  return {
    slug: entry.slug,
    title: edition === "2024" ? (entry.title2024 ?? entry.title) : entry.title,
    tier: entry.tier,
    accent: entry.accent,
    href: getTargetEditionPath(entry.path, edition),
    imageSrc: `${imageDirectory}/${entry.slug}.webp`,
    noAiImageSrc: entry.noAiImageSrc,
  };
}
