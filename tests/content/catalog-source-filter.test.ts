import { describe, expect, it } from "vitest";
import {
  clearSourceParams,
  collectCatalogSources,
  countSourceFilters,
  matchesSourceSelection,
  parseSourceSelection,
  toggleHomebrewParam,
  toggleSourceParam,
} from "@/lib/catalog-source-filter";
import { findSourceLabel } from "@/lib/refs/source-label";

/// Фільтр за джерелом спільний для всіх каталогів; хоумбрю за замовчуванням приховане.

describe("collectCatalogSources", () => {
  it("виносить хоумбрю з переліку книжок у окремий прапорець", () => {
    const sources = collectCatalogSources([
      { source: "MM" },
      { source: "HOMEBREW" },
      { source: "PHB" },
      { source: "MM" },
      { source: "" },
      { source: null },
    ]);

    expect(sources.official).toEqual(["MM", "PHB"]);
    expect(sources.hasHomebrew).toBe(true);
  });

  it("сортує книжки за українською назвою", () => {
    const sources = collectCatalogSources([{ source: "XGTE" }, { source: "TCOE" }, { source: "PHB" }]);
    const labels = sources.official.map(findSourceLabel);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, "uk")));
  });
});

describe("matchesSourceSelection", () => {
  const nothingSelected = { sources: new Set<string>(), homebrew: false };

  it("без вибору показує офіційне і ховає хоумбрю", () => {
    expect(matchesSourceSelection("MM", nothingSelected)).toBe(true);
    expect(matchesSourceSelection("HOMEBREW", nothingSelected)).toBe(false);
    expect(matchesSourceSelection("homebrew", nothingSelected)).toBe(false);
  });

  it("перемикач хоумбрю відкриває його, не чіпаючи книжок", () => {
    const withHomebrew = { sources: new Set<string>(), homebrew: true };
    expect(matchesSourceSelection("HOMEBREW", withHomebrew)).toBe(true);
    expect(matchesSourceSelection("MM", withHomebrew)).toBe(true);
  });

  it("вибрана книжка ховає решту, включно з хоумбрю навіть за ввімкненого перемикача", () => {
    const onlyMm = { sources: new Set(["MM"]), homebrew: true };
    expect(matchesSourceSelection("MM", onlyMm)).toBe(true);
    expect(matchesSourceSelection("PHB", onlyMm)).toBe(false);
    expect(matchesSourceSelection("HOMEBREW", onlyMm)).toBe(false);
  });
});

describe("параметри адреси", () => {
  it("читає src і hb, перемикає та чистить їх", () => {
    const params = new URLSearchParams("src=MM,PHB&hb=1");
    const selection = parseSourceSelection(params);
    expect(Array.from(selection.sources)).toEqual(["MM", "PHB"]);
    expect(selection.homebrew).toBe(true);
    expect(countSourceFilters(selection)).toBe(3);

    toggleSourceParam(params, "MM");
    toggleHomebrewParam(params);
    expect(params.get("src")).toBe("PHB");
    expect(params.has("hb")).toBe(false);

    clearSourceParams(params);
    expect(params.toString()).toBe("");
  });
});

describe("findSourceLabel", () => {
  it("розуміє коди каталогів спорядження, написані по-своєму", () => {
    expect(findSourceLabel("PHB_2014")).toBe(findSourceLabel("PHB"));
    expect(findSourceLabel("TCoE")).toBe(findSourceLabel("TCOE"));
    expect(findSourceLabel("PHB_2024")).not.toBe("PHB_2024");
    expect(findSourceLabel("UNKNOWN_CODE")).toBe("UNKNOWN_CODE");
  });
});
