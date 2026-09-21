import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CATALOG_REGISTRY,
  collectMenuCatalogs,
  collectSearchCatalogs,
  findCatalogHref,
  findCatalogSearchTitle,
  findCatalogTitle,
} from "@/lib/catalogs/catalog-registry";
import { collectHomeCardRows, collectHomeCategories } from "@/components/home/homeCategories";
import { buildOmniSearchIndex, isCatalogShortcut } from "@/lib/omniSearchData";
import sitemap from "@/app/sitemap";

const ROOT = process.cwd();
const APP = join(ROOT, "src/app");
const EDITIONS = ["2014", "2024"] as const;

/// Сторінки верхнього рівня, які не є каталогами: службові перевірки, офлайн-заглушка,
/// показ екранів помилки для розробки й порожній стаб `pers/home`. Новий маршрут поза цим
/// списком мусить потрапити в реєстр.
const NON_CATALOG_ROUTES = new Set(["offline", "posthog-check", "sentry-check", "error-preview", "pers", "qa-sign-in"]);

/// Споживачі, які до O36 тримали власну копію списку каталогів.
const REGISTRY_CONSUMERS = [
  "src/components/home/homeCategories.ts",
  "src/components/ui/NavExtraMenu.tsx",
  "src/components/search/OmniSearchCategoryLinks.tsx",
  "src/components/search/OmniSearchPanel.tsx",
  "src/lib/omniSearchData.ts",
  "src/app/sitemap.ts",
];

function toRuleset(edition: (typeof EDITIONS)[number]) {
  return edition === "2024" ? ("RULES_2024" as const) : ("RULES_2014" as const);
}

function collectRouteDirs(base: string): string[] {
  return readdirSync(base, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "2024" && existsSync(join(base, entry.name, "page.tsx")))
    .map((entry) => entry.name);
}

describe("KR36.1 — один реєстр каталогів", () => {
  it("слаги й порядок у пошуку не повторюються", () => {
    const slugs = CATALOG_REGISTRY.map((entry) => entry.slug);
    expect(new Set(slugs).size).toBe(slugs.length);

    const orders = CATALOG_REGISTRY.map((entry) => entry.searchOrder);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it("кожен запис має підпис, редакції й адресу, що веде на сторінку на диску", () => {
    for (const entry of CATALOG_REGISTRY) {
      expect(entry.title.trim(), entry.slug).not.toBe("");
      expect(entry.editions.length, entry.slug).toBeGreaterThan(0);

      for (const edition of EDITIONS) {
        const href = findCatalogHref(entry.slug, edition);
        if (!entry.editions.includes(edition)) {
          expect(href, `${entry.slug} не існує в ${edition}, а адресу віддає`).toBeNull();
          continue;
        }
        expect(href, `${entry.slug} в ${edition}`).not.toBeNull();
        expect(existsSync(join(APP, href!.replace(/^\//, ""), "page.tsx")), `${entry.slug} (${edition}) веде в ${href}, а сторінки немає`).toBe(true);
      }
    }
  });

  it("кожен маршрут каталогу в src/app присутній у реєстрі", () => {
    const registered = new Set(CATALOG_REGISTRY.map((entry) => entry.path.split("/")[1]));
    const orphans = [
      ...collectRouteDirs(APP).map((dir) => `/${dir}`),
      ...collectRouteDirs(join(APP, "2024")).map((dir) => `/2024/${dir}`),
    ].filter((route) => {
      const segment = route.replace(/^\/2024/, "").split("/")[1];
      return !registered.has(segment) && !NON_CATALOG_ROUTES.has(segment);
    });

    expect(orphans).toEqual([]);
  });

  it("каталог, що шукається індексом, має рядки рівно в своїх редакціях; серверний — жодних", () => {
    for (const entry of CATALOG_REGISTRY) {
      for (const edition of EDITIONS) {
        const rows = buildOmniSearchIndex(toRuleset(edition)).filter(
          (item) => item.category === entry.slug && !isCatalogShortcut(item),
        );
        const expectsRows = entry.search === "index" && entry.editions.includes(edition);
        expect(rows.length > 0, `${entry.slug} у ${edition}: ${rows.length} рядків, режим ${entry.search}`).toBe(expectsRows);
      }
    }
  });

  it("рядок «Каталог» є рівно один на кожен каталог редакції й жодного поза нею", () => {
    for (const edition of EDITIONS) {
      const shortcuts = buildOmniSearchIndex(toRuleset(edition)).filter(isCatalogShortcut);
      const expected = collectSearchCatalogs(edition).map((entry) => entry.slug).sort();
      expect(shortcuts.map((item) => item.category).sort()).toEqual(expected);
      for (const shortcut of shortcuts) {
        expect(shortcut.href).toBe(findCatalogHref(shortcut.category, edition));
      }
    }
  });

  it("реєстр не імпортує каталожних JSON і модулів даних", () => {
    const source = readFileSync(join(ROOT, "src/lib/catalogs/catalog-registry.ts"), "utf8");
    expect(source).not.toMatch(/generated\//);
    expect(source).not.toMatch(/from "@\/lib\/\w+Data"/);
  });

  it("усі колишні власники списку читають реєстр", () => {
    for (const file of REGISTRY_CONSUMERS) {
      const source = readFileSync(join(ROOT, file), "utf8");
      expect(source, file).toContain("@/lib/catalogs/catalog-registry");
    }
  });

  it("плитки головної, меню, плитки й таби пошуку дають один і той самий набір каталогів редакції", () => {
    for (const edition of EDITIONS) {
      const expected = CATALOG_REGISTRY.filter((entry) => entry.editions.includes(edition)).map((entry) => entry.slug).sort();
      expect(collectHomeCategories(edition).map((tile) => tile.slug).sort()).toEqual(expected);
      expect(collectSearchCatalogs(edition).map((entry) => entry.slug).sort()).toEqual(expected);

      const menuSlugs = collectMenuCatalogs(edition).map((entry) => entry.slug);
      const mainBarSlugs = CATALOG_REGISTRY.filter((entry) => entry.menuIcon === null).map((entry) => entry.slug);
      expect([...menuSlugs, ...mainBarSlugs].sort()).toEqual(expected);
    }
  });

  /// Власник, 2026-09-18: бестіарій — третя велика картка першого ряду на десктопі, а на
  /// телефоні лишається малою, але першою в сітці плиток.
  it("бестіарій — третій герой на десктопі й перша плитка на телефоні в обох редакціях", () => {
    for (const edition of EDITIONS) {
      const { heroes, tiles } = collectHomeCardRows(edition);

      expect(heroes.map((hero) => [hero.category.slug, hero.viewport])).toEqual([
        ["characters", "all"],
        ["spells", "all"],
        ["bestiary", "desktop"],
      ]);
      expect(heroes.every((hero) => hero.tier === "hero")).toBe(true);

      expect(tiles[0]).toMatchObject({ category: { slug: "bestiary" }, tier: "tile", viewport: "phone" });
      expect(heroes[2].noAiImageSrc).toBe("/images/manual/bestiary.webp");
      expect(tiles[0].noAiImageSrc, "плитка без ШІ — текстова, як сусідні").toBeUndefined();
      expect(tiles.slice(1).map((tile) => tile.category.slug)).not.toContain("bestiary");
      expect(tiles.slice(1).every((tile) => tile.viewport === "all")).toBe(true);
    }
  });

  it("підписи міняються за редакцією там, де 2024 перейменувала річ", () => {
    expect(findCatalogTitle("races", "2014")).toBe("Раси");
    expect(findCatalogTitle("races", "2024")).toBe("Види");
    expect(findCatalogSearchTitle("characters", "2014")).toBe("Мої персонажі");
  });

  it("sitemap несе корінь кожного публічного каталогу в його редакціях і нічого поза ними", () => {
    const urls = new Set(sitemap().map((entry) => entry.url.replace("https://char.holota.family", "")));
    for (const entry of CATALOG_REGISTRY) {
      for (const edition of EDITIONS) {
        const href = findCatalogHref(entry.slug, edition);
        const inEdition = entry.editions.includes(edition);
        if (entry.isPublic && inEdition) expect(urls.has(href!), `${entry.slug} ${edition}`).toBe(true);
        if (!inEdition) expect(urls.has(`${edition === "2024" ? "/2024" : ""}${entry.path}`), `${entry.slug} ${edition}`).toBe(false);
        if (!entry.isPublic && href) expect(urls.has(href), `${entry.slug} ${edition} не публічний`).toBe(false);
      }
    }
  });
});

describe("KR36.3 — бастіони й інфузії існують лише у своїй редакції", () => {
  it("2024 має таб і плитку бастіонів, 2014 — інфузій, і навпаки — ні", () => {
    const slugs2024 = collectSearchCatalogs("2024").map((entry) => entry.slug);
    const slugs2014 = collectSearchCatalogs("2014").map((entry) => entry.slug);

    expect(slugs2024).toContain("bastions");
    expect(slugs2024).not.toContain("infusions");
    expect(slugs2014).toContain("infusions");
    expect(slugs2014).not.toContain("bastions");
    expect(findCatalogHref("bastions", "2024")).toBe("/2024/bastions");
    expect(findCatalogHref("infusions", "2014")).toBe("/infusions");
  });

  it("жоден рядок індексу не веде на каталог поза його редакцією", () => {
    expect(buildOmniSearchIndex("RULES_2014").filter((item) => item.href.startsWith("/bastions"))).toEqual([]);
    expect(buildOmniSearchIndex("RULES_2024").filter((item) => item.href.startsWith("/infusions"))).toEqual([]);
  });
});
