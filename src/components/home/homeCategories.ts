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
};

type CategoryManifestEntry = {
  slug: string;
  title: string;
  tier: HomeCardTier;
  accent: HomeAccentName;
  /// 2014 path; the 2024 counterpart is derived, never written twice.
  path: string;
  editions: readonly Edition[];
};

/// The KR13.7 table also lists an "Дії" category and public/images/categories/actions.webp
/// exists, but neither /actions nor /2024/actions is an app-router route — src/app/actions holds
/// only level-up.ts, a server-action module. Add the entry once the route does.
const BOTH_EDITIONS = ["2014", "2024"] as const;
const ONLY_2014 = ["2014"] as const;

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
  },
  {
    slug: "magic-items",
    title: "Предмети",
    tier: "tile",
    accent: "ashenSteel",
    path: "/magic-items",
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
    accent: "ashenSteel",
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
    accent: "ashenSteel",
    path: "/feats",
    editions: BOTH_EDITIONS,
  },
  {
    slug: "backgrounds",
    title: "Походження",
    tier: "tile",
    accent: "ashenSteel",
    path: "/backgrounds",
    editions: BOTH_EDITIONS,
  },
  {
    slug: "invocations",
    title: "Потойбічні виклики",
    tier: "tile",
    accent: "ashenSteel",
    path: "/invocations",
    editions: BOTH_EDITIONS,
  },
  {
    slug: "rules",
    title: "Довідник правил",
    tier: "tile",
    accent: "ashenSteel",
    path: "/rules",
    editions: BOTH_EDITIONS,
  },
  {
    slug: "infusions",
    title: "Вливання",
    tier: "tile",
    accent: "ashenSteel",
    path: "/infusions",
    editions: ONLY_2014,
  },
];

export const HOME_EDITION_HEADINGS: Record<Edition, { title: string; subtitle: string }> = {
  "2014": {
    title: "D&D 5e · Редакція 2014",
    subtitle:
      "Творець персонажів, заклинання, предмети й довідник правил PHB 2014 — повністю українською.",
  },
  "2024": {
    title: "D&D 5e · Редакція 2024",
    subtitle:
      "Каталоги, правила та творець персонажів за оновленою редакцією PHB 2024 — українською.",
  },
};

export function collectHomeCategories(edition: Edition): HomeCategory[] {
  return HOME_CATEGORY_MANIFEST.filter((entry) => entry.editions.includes(edition)).map((entry) =>
    buildHomeCategory(entry, edition),
  );
}

function buildHomeCategory(entry: CategoryManifestEntry, edition: Edition): HomeCategory {
  const imageDirectory = entry.tier === "hero" ? "/images/home" : "/images/categories";

  return {
    slug: entry.slug,
    title: entry.title,
    tier: entry.tier,
    accent: entry.accent,
    href: getTargetEditionPath(entry.path, edition),
    imageSrc: `${imageDirectory}/${entry.slug}.webp`,
  };
}
