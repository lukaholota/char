import { describe, expect, it } from "vitest";
import {
  buildOmniSearchIndex,
  findOmniSearchOutcome,
  isCatalogShortcut,
  PER_CATEGORY_RESULT_QUOTA,
  searchOmniIndex,
  type OmniSearchCategory,
} from "@/lib/omniSearchData";
import { buildOmniSearchRows } from "@/lib/search/omniSearchRows";
import { findOmniSearchVisual } from "@/lib/search/searchVisuals";
import { getInfusionVisual } from "@/components/catalogs/catalog-visuals";
import { getAllInfusions } from "@/lib/infusionsData";
import { collectSearchCatalogs } from "@/lib/catalogs/catalog-registry";

describe("KR36.2 — інфузії Винахідника в пошуку", () => {
  it("індекс 2014 містить усі інфузії, індекс 2024 — жодної", () => {
    const rows2014 = buildOmniSearchIndex("RULES_2014").filter((item) => item.category === "infusions" && !isCatalogShortcut(item));
    const rows2024 = buildOmniSearchIndex("RULES_2024").filter((item) => item.category === "infusions");

    expect(rows2014).toHaveLength(getAllInfusions().length);
    expect(rows2024).toHaveLength(0);
    expect(rows2014.every((item) => item.href.startsWith("/infusions/"))).toBe(true);
  });

  it.each(["вливання", "інфузія", "інфузії"])("«%s» знаходить каталог інфузій", (query) => {
    const results = searchOmniIndex(query, "RULES_2014");
    expect(results.some((item) => item.id === "category-infusions" && item.href === "/infusions"), query).toBe(true);
  });

  it("назва запису веде на його сторінку", () => {
    const [first] = searchOmniIndex("Покращена зброя", "RULES_2014");
    expect(first?.category).toBe("infusions");
    expect(first?.href).toBe("/infusions/enhanced-weapon");
    expect(first?.badge).toBe("Рівень 2");
  });

  it("іконка рядка — та сама, що малює каталог для цього targetType", () => {
    const item = buildOmniSearchIndex("RULES_2014").find((row) => row.id === "infusion-1" || (row.category === "infusions" && row.visualKey === "WEAPON"));
    expect(item?.visualKey).toBeTruthy();
    expect(findOmniSearchVisual(item!).icon).toBe(getInfusionVisual(item!.visualKey).icon);
  });
});

/// З фільтром стеля наскрізна (50), тому повна кількість збігів — показані плюс приховані.
function countMatches(query: string, ruleset: "RULES_2014" | "RULES_2024", category: OmniSearchCategory): number {
  const { items, overflow } = findOmniSearchOutcome(query, ruleset, category);
  return items.length + (overflow[0]?.hiddenCount ?? 0);
}

describe("KR36.4 — квота на каталог у режимі «Всі»", () => {
  const PROBES = ["магія", "дракон", "захист"];

  function collectCategoriesWithMatches(query: string): OmniSearchCategory[] {
    return collectSearchCatalogs("2014")
      .filter((entry) => entry.search === "index")
      .map((entry) => entry.slug)
      .filter((slug) => searchOmniIndex(query, "RULES_2014", slug).length > 0);
  }

  it.each(PROBES)("«%s»: кожен каталог зі збігом має рядок у видачі", (query) => {
    const shown = new Set(searchOmniIndex(query, "RULES_2014").map((item) => item.category));
    const withMatches = collectCategoriesWithMatches(query);

    expect(withMatches.length).toBeGreaterThan(3);
    for (const category of withMatches) {
      expect(shown.has(category), `«${query}» ховає каталог ${category}`).toBe(true);
    }
  });

  it("«магія» показує Бестіарій і Метамагію, «дракон» — Довідник правил", () => {
    const magic = new Set(searchOmniIndex("магія", "RULES_2014").map((item) => item.category));
    expect(magic.has("bestiary")).toBe(true);
    expect(magic.has("metamagic")).toBe(true);

    const dragon = new Set(searchOmniIndex("дракон", "RULES_2014").map((item) => item.category));
    expect(dragon.has("rules")).toBe(true);
  });

  it.each(PROBES)("«%s»: жоден каталог не перевищує квоту, а прихований залишок рахується в overflow", (query) => {
    const { items, overflow } = findOmniSearchOutcome(query, "RULES_2014");
    const shownByCategory = new Map<OmniSearchCategory, number>();
    for (const item of items) shownByCategory.set(item.category, (shownByCategory.get(item.category) ?? 0) + 1);

    for (const [category, shown] of shownByCategory) {
      expect(shown, category).toBeLessThanOrEqual(PER_CATEGORY_RESULT_QUOTA);
      const total = countMatches(query, "RULES_2014", category);
      const hidden = overflow.find((entry) => entry.category === category)?.hiddenCount ?? 0;
      if (total <= PER_CATEGORY_RESULT_QUOTA) expect(hidden, category).toBe(0);
      else expect(shown + hidden, category).toBe(total);
    }
  });

  it("каталоги йдуть блоками, а «ще K» стає одразу після останнього рядка свого блоку", () => {
    const { items, overflow } = findOmniSearchOutcome("магія", "RULES_2014");
    const rows = buildOmniSearchRows(items, overflow);

    const seen = new Set<OmniSearchCategory>();
    let previous: OmniSearchCategory | null = null;
    for (const item of items) {
      if (item.category !== previous) {
        expect(seen.has(item.category), `каталог ${item.category} розірваний на два блоки`).toBe(false);
        seen.add(item.category);
        previous = item.category;
      }
    }

    for (const entry of overflow) {
      const moreIndex = rows.findIndex((row) => row.kind === "more" && row.category === entry.category);
      expect(moreIndex, entry.category).toBeGreaterThan(0);
      const before = rows[moreIndex - 1];
      expect(before.kind === "item" && before.item.category === entry.category, entry.category).toBe(true);
    }
    expect(overflow.length).toBeGreaterThan(0);
  });

  it("з вибраним фільтром квота не діє — стеля наскрізна", () => {
    const { items } = findOmniSearchOutcome("магія", "RULES_2014", "spells");
    expect(items.length).toBeGreaterThan(PER_CATEGORY_RESULT_QUOTA);
    expect(items.every((item) => item.category === "spells")).toBe(true);
  });
});

describe("KR36.5 — людські ключові слова зброї й предметів", () => {
  const PAIRS: Array<[OmniSearchCategory, string, string]> = [
    ["weapons", "проста зброя", "SIMPLE_WEAPON"],
    ["weapons", "бойова зброя", "MARTIAL_WEAPON"],
    ["weapons", "дворучна", "TWO_HANDED"],
    ["weapons", "легка", "LIGHT"],
    ["magic-items", "дивовижний предмет", "WONDROUS_ITEM"],
  ];

  it.each(PAIRS)("%s: «%s» і «%s» дають однакову видачу в обох редакціях", (category, label, raw) => {
    for (const ruleset of ["RULES_2014", "RULES_2024"] as const) {
      const byLabel = findOmniSearchOutcome(label, ruleset, category);
      const byRaw = findOmniSearchOutcome(raw, ruleset, category);

      expect(byLabel.items.length, `${label} (${ruleset})`).toBeGreaterThan(0);
      const total = countMatches(label, ruleset, category);
      expect(total, `${label} (${ruleset})`).toBe(countMatches(raw, ruleset, category));
      if (total <= byLabel.items.length) {
        expect(new Set(byLabel.items.map((item) => item.id))).toEqual(new Set(byRaw.items.map((item) => item.id)));
      }
    }
  });

  it("джерело шукається і кодом, і назвою книги", () => {
    const byCode = searchOmniIndex("PHB_2014", "RULES_2014", "weapons");
    const byLabel = searchOmniIndex("Книга Гравця", "RULES_2014", "weapons");
    expect(byCode.length).toBeGreaterThan(0);
    expect(byLabel.map((item) => item.id).sort()).toEqual(byCode.map((item) => item.id).sort());
  });
});
